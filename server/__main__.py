from http.server import HTTPServer
from .server import handler

print('serving...')
HTTPServer(('localhost', 80), handler).serve_forever()
