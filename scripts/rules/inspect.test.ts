import * as NodeServices from '@effect/platform-node/NodeServices'
import { expect, layer } from '@effect/vitest'
import { Effect } from 'effect'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'
import { vi } from 'vitest'
import { discoverCoreRulesPdfPaths, discoverTournamentRulesPdfPaths } from './inspect'

layer(NodeServices.layer)('rules inspection discovery', (it) => {
	it.effect('discovers canonical Core Rules PDFs in version order', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const sourcesDirectory = pathService.resolve(import.meta.dirname, '..', '..', 'sources')
			const readDirectory = vi.fn(() =>
				Effect.succeed([
					'CR-v1.10.pdf',
					'Tournament-Rules-2026-01-01.pdf',
					'CR-v1.2.txt',
					'CR-v01.3.pdf',
					'notes.md',
					'CR-v1.2.pdf',
				]),
			)
			const controlledFileSystem = FileSystem.FileSystem.of({ ...fileSystem, readDirectory })

			const paths = yield* discoverCoreRulesPdfPaths().pipe(
				Effect.provideService(FileSystem.FileSystem, controlledFileSystem),
			)

			expect(readDirectory).toHaveBeenCalledExactlyOnceWith(sourcesDirectory)
			expect(paths).toStrictEqual([
				pathService.join(sourcesDirectory, 'CR-v1.2.pdf'),
				pathService.join(sourcesDirectory, 'CR-v1.10.pdf'),
			])
		}),
	)

	it.effect('discovers canonical Tournament Rules PDFs in date order', () =>
		Effect.gen(function* () {
			const fileSystem = yield* FileSystem.FileSystem
			const pathService = yield* Path.Path
			const sourcesDirectory = pathService.resolve(import.meta.dirname, '..', '..', 'sources')
			const readDirectory = vi.fn(() =>
				Effect.succeed([
					'Tournament-Rules-2026-10-09.pdf',
					'CR-v1.2.pdf',
					'Tournament-Rules-2025-12-31.txt',
					'Tournament-Rules-2026-2-01.pdf',
					'notes.md',
					'Tournament-Rules-2025-12-31.pdf',
				]),
			)
			const controlledFileSystem = FileSystem.FileSystem.of({ ...fileSystem, readDirectory })

			const paths = yield* discoverTournamentRulesPdfPaths().pipe(
				Effect.provideService(FileSystem.FileSystem, controlledFileSystem),
			)

			expect(readDirectory).toHaveBeenCalledExactlyOnceWith(sourcesDirectory)
			expect(paths).toStrictEqual([
				pathService.join(sourcesDirectory, 'Tournament-Rules-2025-12-31.pdf'),
				pathService.join(sourcesDirectory, 'Tournament-Rules-2026-10-09.pdf'),
			])
		}),
	)
})
