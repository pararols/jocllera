import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'save-gis-middleware',
      configureServer(server) {
        server.middlewares.use('/api/save-gis', (req, res) => {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              try {
                const targetPath = path.resolve(__dirname, 'src/data/gis_data.json')
                // Validate JSON syntax first
                JSON.parse(body)
                fs.writeFileSync(targetPath, body, 'utf-8')
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ ok: true }))
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: err.message }))
              }
            })
          } else {
            res.writeHead(405)
            res.end()
          }
        })
      }
    }
  ],
  server: {
    fs: {
      strict: false,
      allow: ['..', 'C:/', 'D:/']
    }
  }
})
