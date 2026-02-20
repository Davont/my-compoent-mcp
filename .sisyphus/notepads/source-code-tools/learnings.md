# Learnings — source-code-tools

## Session Start
- Project uses rslib (Rspack-based) for building
- tsconfig: moduleResolution "bundler", allowImportingTsExtensions, noEmit
- All imports use `.js` extension convention (e.g., `./tools/index.js`)
- Existing tools pattern: `Tool` type + `handler` function + named exports
- server.ts dynamically reads tools/toolHandlers from tools/index.ts — no need to touch server.ts
- @my-design/react is NOT installed in node_modules currently
- Build outputs: dist/index.js, dist/stdio.js, dist/http.js + .d.ts + tools/ + utils/ subdirs
- rslib auto-externalizes all dependencies in lib mode

## Task 2: source-code-reader.ts
- `npx tsc --noEmit` requires `npm install` first (deps must be present for type resolution)
- Path traversal protection: `resolve()` + `startsWith(realRoot + sep)` pattern works reliably
- Binary detection via null byte scan of first 8192 bytes is simple and effective
- Scoped package name extraction: check if penultimate path segment starts with `@`
- Exclude dirs pattern reused from semi-mcp reference: array of path segments with `/` delimiters
- All sync fs APIs — consistent with doc-reader.ts pattern (no async in utils)
## Task 4: get-component-file-list.ts
- Tool handler pattern: extract args with `as string | undefined`, check missing → isError, try-catch → isError
- `resolvePackageRoot` throws on missing package — catch provides friendly error
- `listComponentFiles` returns empty files array (not throw) when component not found — check `.length === 0`
- `listTopLevelDirectories` provides suggestion list when component not found
- Only show non-zero file type stats to keep output clean
- No version parameter needed (unlike semi-mcp which versions packages)
- `type: 'object' as const` needed in inputSchema for TypeScript satisfaction

## Task 3: remove-function-body.ts
- Copied semi-mcp implementation for AST traversal + function body stripping using `oxc-parser` `parseSync`
- For this environment, `lsp_diagnostics` requires `typescript-language-server` to be on `$PATH` (installable without sudo via `npm i -g --prefix ~/.local typescript-language-server typescript`)

## Task 5: get-file-code.ts
- `parseFilePath` uses generic scoped regex `/^(@[^/]+\/[^/]+)\/(.+)$/` — no hardcoded package names
- `isScriptFile` covers `.ts/.tsx/.js/.jsx` (broader than semi-mcp's TypeScript-only check)
- Two separate try-catch blocks for `resolvePackageRoot` and `readSourceFile` — different error messages
- `removeFunctionBodies(content, filePath)` takes filePath as 2nd arg so oxc-parser picks correct parse mode
- `npx tsc --noEmit` alone shows zod v4 locale errors from node_modules — use `--skipLibCheck` for clean output
- Output format: file path, line count, char size, optional processing info, separator, code content

## Task 6: get-function-code.ts
- Adapted from semi-mcp reference but simplified: no version param, no regex matching, no multi-function extraction
- `parseFilePath` is self-contained copy (same logic as get-file-code.ts but NOT shared — each tool owns its own)
- `extractFunction(content, functionName, filePath)` — filePath as 3rd arg for correct oxc-parser parse mode
- `getFunctionNames(content, filePath)` — same filePath passing pattern for available function listing
- Error flow: missing args → parse path → resolvePackageRoot → readSourceFile → extractFunction → format output
- Function-not-found case lists all available functions with count — helpful for LLM to self-correct
- Output format mirrors semi-mcp: file path + function name + separator line + function code (no version)
