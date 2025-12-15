import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'http'

// Custom plugin to proxy MCP requests (handles CORS for n8n connections)
function mcpProxyPlugin(): Plugin {
  return {
    name: 'mcp-proxy',
    configureServer(server) {
      // Proxy SSE connections
      server.middlewares.use('/api/mcp-proxy/sse', async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`)
        const targetUrl = url.searchParams.get('target')

        if (!targetUrl) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing target URL' }))
          return
        }

        try {
          console.log('[MCP Proxy] SSE connecting to:', targetUrl)

          const response = await fetch(targetUrl, {
            headers: {
              'Accept': 'text/event-stream',
            },
          })

          console.log('[MCP Proxy] SSE response status:', response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.error('[MCP Proxy] SSE error:', response.status, errorText)
            res.statusCode = response.status
            res.end(errorText || `HTTP ${response.status}`)
            return
          }

          // Set SSE headers
          res.setHeader('Content-Type', 'text/event-stream')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('Access-Control-Allow-Origin', '*')

          // Stream the response
          const reader = response.body?.getReader()
          if (!reader) {
            res.statusCode = 500
            res.end('No response body')
            return
          }

          const decoder = new TextDecoder()

          const pump = async (): Promise<void> => {
            try {
              const { done, value } = await reader.read()
              if (done) {
                res.end()
                return
              }
              const chunk = decoder.decode(value, { stream: true })
              res.write(chunk)
              return pump()
            } catch {
              res.end()
            }
          }

          req.on('close', () => {
            reader.cancel()
          })

          await pump()
        } catch (err) {
          console.error('[MCP Proxy] SSE exception:', err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(err) }))
        }
      })

      // Proxy POST messages
      server.middlewares.use('/api/mcp-proxy/message', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }

        const url = new URL(req.url || '', `http://${req.headers.host}`)
        const targetUrl = url.searchParams.get('target')

        if (!targetUrl) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing target URL' }))
          return
        }

        try {
          console.log('[MCP Proxy] POST to:', targetUrl)

          // Read request body
          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(chunk as Buffer)
          }
          const body = Buffer.concat(chunks).toString()
          console.log('[MCP Proxy] POST body:', body)

          const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body,
          })

          const responseText = await response.text()
          console.log('[MCP Proxy] POST response:', response.status, responseText)

          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Content-Type', 'application/json')
          res.statusCode = response.status
          res.end(responseText)
        } catch (err) {
          console.error('[MCP Proxy] POST exception:', err)
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(err) }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mcpProxyPlugin()],
})
