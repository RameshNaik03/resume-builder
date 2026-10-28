import http from "node:http";
import { once } from "node:events";

// A local stand-in for the Claude API, so the AI code paths can be tested without a real key
// or network. Points the SDK at it (ANTHROPIC_BASE_URL) with a fake key.
//   respond(requestBody) - returns the JSON the model should "write" (becomes the message text),
//                          or { status, error } to answer with an API error instead
// Returns { requests, close }: requests are the parsed request bodies received.
export async function startFakeClaude(respond) {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const request = JSON.parse(body || "{}");
      requests.push(request);
      const answer = respond(request);
      if (answer?.error) {
        res.writeHead(answer.status ?? 500, { "content-type": "application/json" });
        return res.end(JSON.stringify({ type: "error", error: { type: answer.error, message: "fake error" } }));
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: request.model,
          content: [{ type: "text", text: JSON.stringify(answer) }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        })
      );
    });
  }).listen(0);
  await once(server, "listening");

  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://localhost:${server.address().port}`;
  return {
    requests,
    close: () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_BASE_URL;
      server.close();
    },
  };
}
