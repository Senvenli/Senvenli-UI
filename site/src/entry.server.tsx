import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, type EntryContext } from "react-router";

/** Build time only (ssr: false): the prerender calls this once per path and waits for the whole page. */
export default function handleRequest(request: Request, status: number, headers: Headers, context: EntryContext) {
  return new Promise<Response>((resolve, reject) => {
    const { pipe } = renderToPipeableStream(<ServerRouter context={context} url={request.url} />, {
      onAllReady() {
        const body = new PassThrough();
        headers.set("Content-Type", "text/html");
        resolve(new Response(createReadableStreamFromReadable(body), { headers, status }));
        pipe(body);
      },
      onShellError: reject,
      // A page that throws must fail the build, never ship half rendered.
      onError: reject,
    });
  });
}
