# continuum

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Self, TRPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **tRPC** - End-to-end type-safe APIs
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system
- **Biome** - Linting and formatting
- **Tauri** - Build native desktop applications
- **Husky** - Git hooks for code quality

## Getting Started

First, install the dependencies:

```bash
bun install
```


Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see your fullstack application.






## Deployment (Alchemy)
- Web dev: cd apps/web && bun run dev
- Web deploy: cd apps/web && bun run deploy
- Web destroy: cd apps/web && bun run destroy


## Project Structure

```
continuum/
├── apps/
│   └── web/         # Fullstack application (Next.js)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## GPU-Accelerated Inference

Continuum supports CUDA for GPU-accelerated inference (22 tok/sec vs 1-2 tok/sec on CPU).

```bash
# Build with CUDA support (from apps/web)
cd apps/web
bun run desktop:build:cuda
```

See [docs/development.md](./docs/development.md) for full CUDA setup instructions.

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run check-types`: Check TypeScript types across all apps
- `bun run check`: Run Biome formatting and linting
- `cd apps/web && bun run desktop:dev`: Start Tauri desktop app (CPU)
- `cd apps/web && bun run desktop:dev:cuda`: Start Tauri desktop app (CUDA)
- `cd apps/web && bun run desktop:build`: Build Tauri desktop app (CPU)
- `cd apps/web && bun run desktop:build:cuda`: Build Tauri desktop app (CUDA)
