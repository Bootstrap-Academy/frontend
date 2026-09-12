/** Mounted Nuxt UI with a synthetic API only. No GitHub writes or real account data. */
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const app = process.env.FEEDBACK_TEST_APP || "http://127.0.0.1:56621";
const api = process.env.FEEDBACK_TEST_API || "http://127.0.0.1:56623";
const cdp = process.env.FEEDBACK_TEST_CDP || "http://127.0.0.1:56622";
const targets = await (await fetch(cdp + "/json/list")).json();
const ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
await new Promise((resolve) => {
  ws.onopen = resolve;
});
let sequence = 0,
  mode = "created";
const waiting = new Map(),
  requests = [],
  exceptions = [];
const temporary = await mkdtemp(join(tmpdir(), "feedback-browser-"));
let captureFixtureScript;
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    waiting.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function fulfill(requestId, status, body) {
  await command("Fetch.fulfillRequest", {
    requestId,
    responseCode: status,
    responseHeaders: [
      { name: "Content-Type", value: "application/json" },
      { name: "Access-Control-Allow-Origin", value: "*" },
      { name: "Access-Control-Allow-Methods", value: "*" },
      { name: "Access-Control-Allow-Headers", value: "*" },
    ],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  });
}
ws.onmessage = async ({ data }) => {
  const event = JSON.parse(data);
  if (event.id) {
    const pending = waiting.get(event.id);
    waiting.delete(event.id);
    if (event.error) pending?.reject(new Error(JSON.stringify(event.error)));
    else pending?.resolve(event.result);
  } else if (event.method === "Runtime.exceptionThrown") {
    exceptions.push(
      event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text
    );
  } else if (event.method === "Fetch.requestPaused") {
    const { request, requestId } = event.params;
    const url = new URL(request.url);
    if (url.origin === app || ["data:", "blob:"].includes(url.protocol)) {
      await command("Fetch.continueRequest", { requestId });
    } else if (url.origin === api) {
      if (request.method === "OPTIONS") await fulfill(requestId, 200, {});
      else if (url.pathname === "/feedback" && request.method === "POST") {
        const body = JSON.parse(request.postData);
        requests.push({ body, headers: request.headers });
        if (mode === "pending")
          await fulfill(requestId, 202, { status: "pending", request_id: body.request_id });
        else
          await fulfill(requestId, 200, {
            status: "created",
            issue_url: "https://github.com/Bootstrap-Academy/Bootstrap-Academy/issues/160",
          });
      } else await fulfill(requestId, 200, {});
    } else await command("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
  }
};
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression, milliseconds = 15000) {
  const end = Date.now() + milliseconds;
  while (Date.now() < end) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out: " + expression + "; exceptions: " + exceptions.join("\n"));
}
async function click(selector) {
  const rect = await evaluate(
    "(()=>{const e=document.querySelector(" +
      JSON.stringify(selector) +
      ");e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()"
  );
  await command("Input.dispatchMouseEvent", {
    type: "mousePressed",
    button: "left",
    clickCount: 1,
    ...rect,
  });
  await command("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    button: "left",
    clickCount: 1,
    ...rect,
  });
}
async function button(pattern) {
  const index = await evaluate(
    "Array.from(document.querySelectorAll('.feedback-dialog button')).findIndex(e=>new RegExp(" +
      JSON.stringify(pattern) +
      ").test(e.textContent))"
  );
  assert.ok(index >= 0, "button exists: " + pattern);
  await evaluate("document.querySelectorAll('.feedback-dialog button')[" + index + "].click()");
}
async function fill(selector, value) {
  await evaluate(
    "(()=>{const e=document.querySelector(" +
      JSON.stringify(selector) +
      ");e.value=" +
      JSON.stringify(value) +
      ";e.dispatchEvent(new Event('input',{bubbles:true}))})()"
  );
}
async function open() {
  await click(".feedback-open");
  await until(
    "document.querySelector('.feedback-dialog input[type=text]') && !document.querySelector('.feedback-dialog').style.display"
  );
}
async function form() {
  await fill(".feedback-dialog input[type=text]", "Synthetic feedback");
  await fill(".feedback-dialog textarea", "Synthetic description, no private user data.");
}
async function footerControls() {
  await until("!!document.querySelector('footer') && !!document.querySelector('.feedback-open')");
  await evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
  await evaluate(
    "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
  );
  const result = await evaluate(`(() => {
    const launcher = document.querySelector('.feedback-open').getBoundingClientRect();
    return {
      width: innerWidth,
      footer: document.querySelectorAll('footer').length,
      launcher: document.querySelectorAll('.feedback-open').length,
      cancellation: document.querySelectorAll('footer a[href="/vertrag-kuendigen"]').length,
      withdrawal: document.querySelectorAll('footer a[href="/vertrag-widerrufen"]').length,
      obscuredLinks: Array.from(document.querySelectorAll('footer a')).filter(link => {
        const rect = link.getBoundingClientRect();
        return rect.left < launcher.right && rect.right > launcher.left &&
          rect.top < launcher.bottom && rect.bottom > launcher.top;
      }).map(link => link.getAttribute('href')),
    };
  })()`);
  assert.equal(result.footer, 1);
  assert.equal(result.launcher, 1);
  assert.equal(result.cancellation, 1);
  assert.equal(result.withdrawal, 1);
  assert.deepEqual(result.obscuredLinks, [], "footer controls remain clear of the launcher");
  return result;
}
try {
  await command("Runtime.enable");
  await command("Page.enable");
  // Exercise the real component with synthetic media tracks, without an OS picker.
  // This is not evidence of browser/OS permission UI support.
  captureFixtureScript = (
    await command("Page.addScriptToEvaluateOnNewDocument", {
      source: `(() => {
      const state = window.feedbackCaptureFixture = { mode: 'reject', tracks: [], config: null };
      const media = navigator.mediaDevices;
      media.setCaptureHandleConfig = config => { state.config = config; };
      media.getDisplayMedia = async () => {
        if (state.mode === 'reject') throw new DOMException('Synthetic cancellation', 'NotAllowedError');
        const canvas = document.createElement('canvas');
        canvas.width = 120; canvas.height = 80;
        const context = canvas.getContext('2d');
        context.fillStyle = 'orange'; context.fillRect(0, 0, 120, 80);
        // Stand-in for a rendered receipt/name, not an editable input field.
        context.fillStyle = 'white'; context.font = '10px sans-serif';
        context.fillText('SYNTHETIC RECEIPT', 2, 12);
        const stream = canvas.captureStream(30);
        const track = stream.getVideoTracks()[0];
        state.tracks.push(track);
        const mode = state.mode;
        const handle = state.config.handle;
        track.getSettings = () => ({ displaySurface: mode === 'wrong' ? 'monitor' : 'browser' });
        track.getCaptureHandle = () => ({ handle });
        if (mode === 'deferred') return await new Promise(resolve => { state.resolve = () => resolve(stream); });
        return stream;
      };
    })()`,
    })
  ).identifier;
  await command("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await command("Page.navigate", { url: app + "/docs/imprint" });
  await until("document.querySelector('.feedback-open')", 30000);
  await open();
  await form();
  assert.equal(
    await evaluate("document.querySelector('.feedback-dialog input[type=checkbox]').checked"),
    false
  );
  assert.equal(requests.length, 0);
  await button("Öffentlich melden|Submit publicly");
  await until("!!document.querySelector('.feedback-dialog a[href$=\"/issues/160\"]')");
  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0].body).sort(), [
    "description",
    "diagnostics_consent",
    "kind",
    "request_id",
    "title",
  ]);
  assert.equal(requests[0].body.diagnostics_consent, false);
  assert.equal(
    Object.keys(requests[0].headers).some((key) => key.toLowerCase() === "authorization"),
    false
  );

  await button("Weitere Meldung|Write another");
  await form();
  await click(".feedback-dialog input[type=checkbox]");
  await until("!!document.querySelector('.feedback-dialog dl')");
  await click(".feedback-dialog input[type=checkbox]");
  assert.equal(await evaluate("!!document.querySelector('.feedback-dialog dl')"), false);
  mode = "pending";
  await button("Öffentlich melden|Submit publicly");
  await until("!!document.querySelector('.feedback-dialog [role=alert]')");
  assert.equal(requests.length, 2);
  assert.equal(requests[1].body.diagnostics, undefined);
  assert.equal(
    await evaluate("document.querySelector('.feedback-dialog fieldset').disabled"),
    true
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(requests.length, 2, "pending never polls automatically");
  mode = "created";
  await button("Status prüfen|Check status");
  await until("!!document.querySelector('.feedback-dialog a[href$=\"/issues/160\"]')");
  assert.deepEqual(
    requests[2].body,
    requests[1].body,
    "explicit reconciliation uses exact request"
  );

  await button("Weitere Meldung|Write another");
  await form();
  const fixture = await evaluate(
    "(()=>{const c=document.createElement('canvas');c.width=120;c.height=80;const x=c.getContext('2d');x.fillStyle='red';x.fillRect(10,10,70,30);x.fillStyle='white';x.font='12px sans-serif';x.fillText('SECRET',12,28);return c.toDataURL('image/png')})()"
  );
  const filename = join(temporary, "synthetic-private-pixels.png");
  await writeFile(filename, Buffer.from(fixture.split(",")[1], "base64"));
  const document = await command("DOM.getDocument");
  const fileNode = await command("DOM.querySelector", {
    nodeId: document.root.nodeId,
    selector: ".feedback-image input[type=file]",
  });
  await command("DOM.setFileInputFiles", { nodeId: fileNode.nodeId, files: [filename] });
  await until("!!document.querySelector('.feedback-image canvas')");
  assert.equal(requests.length, 3, "upload only loads local pixels");
  await evaluate("document.querySelector('.feedback-image details').open=true");
  async function region(tool, values) {
    await evaluate(
      "(()=>{const s=document.querySelector('.feedback-image select');s.value=" +
        JSON.stringify(tool) +
        ";s.dispatchEvent(new Event('change',{bubbles:true}));const es=document.querySelectorAll('.feedback-image input[type=number]');" +
        JSON.stringify(values) +
        ".forEach((v,i)=>{es[i].value=v;es[i].dispatchEvent(new Event('input',{bubbles:true}))})})()"
    );
    await button("Werkzeug anwenden|Apply tool");
  }
  await region("redact", [10, 10, 70, 30]);
  await region("crop", [0, 0, 90, 50]);
  await button("Dieses Bild anhängen|Attach this image");
  await until("!!document.querySelector('.feedback-image img')");
  assert.equal(requests.length, 3, "attachment confirmation still does not upload");
  const preview = await evaluate("document.querySelector('.feedback-image img').src");
  await button("^Schließen$|^Close$");
  await open();
  assert.equal(
    await evaluate("document.querySelector('.feedback-image img').src"),
    preview,
    "closing/reopening retains visible exact attachment"
  );
  await click(".feedback-dialog input[type=checkbox]");
  await until("!!document.querySelector('.feedback-dialog dl')");
  await button("Öffentlich melden|Submit publicly");
  await until("!!document.querySelector('.feedback-dialog a[href$=\"/issues/160\"]')");
  assert.equal(requests.length, 4);
  const sent = requests[3].body;
  assert.equal(sent.screenshot.data_url, preview);
  assert.deepEqual(Object.keys(sent.screenshot), ["data_url"]);
  assert.deepEqual(Object.keys(sent.diagnostics).sort(), [
    "app_build",
    "browser",
    "language",
    "os",
    "reduced_motion",
    "theme",
    "viewport",
  ]);
  const pixels = await evaluate(
    "(async()=>{const b=await createImageBitmap(await(await fetch(" +
      JSON.stringify(sent.screenshot.data_url) +
      ")).blob());const c=document.createElement('canvas');c.width=b.width;c.height=b.height;const x=c.getContext('2d');x.drawImage(b,0,0);return {width:c.width,height:c.height,masked:Array.from(x.getImageData(20,20,1,1).data),background:Array.from(x.getImageData(0,0,1,1).data)}})()"
  );
  assert.deepEqual(pixels, {
    width: 90,
    height: 50,
    masked: [0, 0, 0, 255],
    background: [255, 255, 255, 255],
  });

  await button("Weitere Meldung|Write another");
  await form();
  await command("Emulation.setDeviceMetricsOverride", {
    width: 320,
    height: 640,
    deviceScaleFactor: 1,
    mobile: true,
  });
  const geometry = await evaluate(
    "(()=>{const p=document.querySelector('.feedback-panel');return {width:p.getBoundingClientRect().width,viewport:innerWidth,scroll:p.scrollWidth,client:p.clientWidth,publicNotice:p.textContent.includes('GitHub')}})()"
  );
  assert.ok(geometry.width <= geometry.viewport);
  assert.ok(geometry.scroll <= geometry.client + 1, "no horizontal panel overflow");
  assert.equal(geometry.publicNotice, true);
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
  await until("getComputedStyle(document.querySelector('.feedback-open')).display !== 'none'");
  assert.equal(
    await evaluate("document.activeElement === document.querySelector('.feedback-open')"),
    true
  );
  const mobileFooter = await footerControls();
  await open();
  await form();
  const accountChange = await evaluate(
    "(()=>{const vm=document.querySelector('.feedback-open').__vueParentComponent;if(!('user' in vm.setupState))return false;vm.setupState.user={id:'12345678-1234-4234-8234-123456789011'};return true})()"
  );
  assert.equal(accountChange, true, "synthetic account boundary reached");
  await until("getComputedStyle(document.querySelector('.feedback-open')).display !== 'none'");
  await open();
  assert.equal(
    await evaluate("document.querySelector('.feedback-dialog input[type=text]').value"),
    ""
  );
  assert.equal(
    await evaluate("document.querySelector('.feedback-dialog input[type=checkbox]').checked"),
    false
  );
  assert.equal(await evaluate("!!document.querySelector('.feedback-image img')"), false);
  await button("Diesen Tab aufnehmen|Capture this tab");
  await until(
    "document.querySelector('.feedback-image').textContent.includes('Die Aufnahme hat nicht geklappt') || document.querySelector('.feedback-image').textContent.includes('The capture didn’t work')"
  );
  assert.equal(await evaluate("!!document.querySelector('.feedback-image canvas')"), false);
  await evaluate("window.feedbackCaptureFixture.mode='wrong'");
  await button("Diesen Tab aufnehmen|Capture this tab");
  await until(
    "window.feedbackCaptureFixture.tracks.length===1 && window.feedbackCaptureFixture.tracks.every(t=>t.readyState==='ended')"
  );
  assert.equal(
    await evaluate("!!document.querySelector('.feedback-image canvas')"),
    false,
    "wrong capture surface is rejected"
  );
  await evaluate("window.feedbackCaptureFixture.mode='current'");
  await button("Diesen Tab aufnehmen|Capture this tab");
  await until(
    "!!document.querySelector('.feedback-image canvas') && window.feedbackCaptureFixture.tracks.every(t=>t.readyState==='ended')"
  );
  assert.equal(
    await evaluate("!!document.querySelector('.feedback-image img')"),
    false,
    "capture needs explicit attachment confirmation"
  );
  assert.equal(requests.length, 4, "capture never uploads before send");
  async function captureIsOpaqueBlack() {
    return await evaluate(`(() => {
      const canvas = document.querySelector('.feedback-image canvas');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels.every((value, index) => value === (index % 4 === 3 ? 255 : 0));
    })()`);
  }
  assert.equal(await captureIsOpaqueBlack(), false, "public view retains unmasked pixels");
  await button("Bild entfernen|Remove image");
  const privateCapturePaths = [
    "/orders",
    "/subscription",
    "/vertrag-kuendigen",
    "/vertrag-widerrufen",
    "/account",
    "/profile/synthetic-private",
    "/moderation",
  ];
  // Keep the mounted component and synthetic media source. Only change the
  // pathname consumed by its privacy rule; no account or contract API is called.
  for (const pathname of privateCapturePaths) {
    await evaluate(`history.replaceState(history.state, '', ${JSON.stringify(pathname)})`);
    await button("Diesen Tab aufnehmen|Capture this tab");
    await until(
      "!!document.querySelector('.feedback-image canvas') && window.feedbackCaptureFixture.tracks.every(t=>t.readyState==='ended')"
    );
    assert.equal(await captureIsOpaqueBlack(), true, pathname + " hides all rendered private text");
    await button("Dieses Bild anhängen|Attach this image");
    await until("!!document.querySelector('.feedback-image img')");
    assert.equal(
      await evaluate(`(async () => {
        const image = await createImageBitmap(await (await fetch(document.querySelector('.feedback-image img').src)).blob());
        const canvas = document.createElement('canvas');
        canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d'); context.drawImage(image, 0, 0); image.close();
        return context.getImageData(0, 0, canvas.width, canvas.height).data
          .every((value, index) => value === (index % 4 === 3 ? 255 : 0));
      })()`),
      true,
      pathname + " keeps opaque masking in the final attached PNG"
    );
    await button("Bild entfernen|Remove image");
  }
  // Navigation while awaiting the picker must not expose the previous private view.
  await evaluate(`history.replaceState(history.state, '', '/orders');
    window.feedbackCaptureFixture.mode='deferred'; window.feedbackCaptureFixture.resolve=null`);
  await button("Diesen Tab aufnehmen|Capture this tab");
  await until("typeof window.feedbackCaptureFixture.resolve==='function'");
  await evaluate(`history.replaceState(history.state, '', '/docs/imprint');
    window.feedbackCaptureFixture.resolve()`);
  await until(
    "!!document.querySelector('.feedback-image canvas') && window.feedbackCaptureFixture.tracks.every(t=>t.readyState==='ended')"
  );
  assert.equal(
    await captureIsOpaqueBlack(),
    true,
    "private capture stays masked across navigation"
  );
  assert.equal(requests.length, 4, "private captures and attachments remain local");
  await button("Bild entfernen|Remove image");
  await evaluate("window.feedbackCaptureFixture.mode='deferred'");
  await button("Diesen Tab aufnehmen|Capture this tab");
  await until("typeof window.feedbackCaptureFixture.resolve==='function'");
  await evaluate(
    "document.querySelector('.feedback-open').__vueParentComponent.setupState.user={id:'12345678-1234-4234-8234-123456789012'}"
  );
  await until("getComputedStyle(document.querySelector('.feedback-open')).display !== 'none'");
  await evaluate("window.feedbackCaptureFixture.resolve()");
  await until("window.feedbackCaptureFixture.tracks.every(t=>t.readyState==='ended')");
  await open();
  assert.equal(
    await evaluate("!!document.querySelector('.feedback-image canvas')"),
    false,
    "late capture cannot cross an account boundary"
  );
  await command("Page.navigate", { url: app + "/missing-feedback-integration-test" });
  await until(
    "!!document.querySelector('.error-code') && !!document.querySelector('.feedback-open')"
  );
  const errorFooter = await footerControls();
  await open();
  assert.equal(await evaluate("document.querySelectorAll('footer').length"), 1);
  assert.equal(await evaluate("document.querySelectorAll('.feedback-open').length"), 1);
  assert.equal(exceptions.length, 0, exceptions.join("\n"));
  console.log(
    JSON.stringify(
      {
        passed: true,
        requests: requests.length,
        text_only: true,
        consent_revocation: true,
        exact_pending_retry: true,
        local_attachment: true,
        opaque_redaction: true,
        cropped_final_raster: pixels,
        close_reopen_attachment: true,
        mobile_320: geometry,
        mobile_footer: mobileFooter,
        error_footer: errorFooter,
        escape_focus: true,
        account_boundary: true,
        capture_cancel_and_wrong_surface: true,
        capture_local_only_and_tracks_stopped: true,
        private_capture_paths: privateCapturePaths,
        private_capture_attached_png_opaque: true,
        private_capture_navigation: true,
        late_capture_account_boundary: true,
      },
      null,
      2
    )
  );
} finally {
  if (captureFixtureScript)
    await command("Page.removeScriptToEvaluateOnNewDocument", {
      identifier: captureFixtureScript,
    }).catch(() => {});
  await command("Fetch.disable").catch(() => {});
  ws.close();
  await rm(temporary, { recursive: true, force: true });
}
