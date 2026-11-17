import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * 单元测试只覆盖可在 Node 中运行的 store/工具逻辑，
 * 因此用固定清单替换构建期虚拟模块，避免测试时扫描 music/ 目录。
 */
export default defineConfig({
  resolve: {
    alias: {
      'virtual:music-manifest': fileURLToPath(
        new URL('./tests/fixtures/music-manifest.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
})
