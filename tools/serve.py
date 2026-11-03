"""四季の径の静的配信。~/.claude/skills/htmlpage/references/serve.py に以下の2点を足したもの。

- Windows の mimetypes は .js を text/plain と返すことがあるので、MIME を明示する(元のまま)
- Cache-Control: no-cache を付ける。付けないとブラウザが推測でモジュールをキャッシュし、
  更新後に新旧の js が混ざって "does not provide an export named ..." で起動しなくなった(実測)
"""

import functools
import http.server
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".hdr": "application/octet-stream",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 9101
directory = sys.argv[2] if len(sys.argv) > 2 else "."
http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Handler, directory=directory)).serve_forever()
