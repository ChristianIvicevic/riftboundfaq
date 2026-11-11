import { OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { describe, expect, test } from 'vitest'
import { inspectDrawings } from './drawings'

describe('inspectDrawings', () => {
	test('tolerates unmatched state restoration', () => {
		expect(
			inspectDrawings({
				fnArray: [OPS.restore, OPS.constructPath],
				argsArray: [[], [OPS.stroke, null, [0, 0, 20, 0.5]]],
			}),
		).toStrictEqual({
			horizontalStrokes: [{ x: 0, y: 0, width: 20, height: 0.5, lineWidth: 1 }],
			yellowFills: [],
			tableLines: [],
		})
	})

	test('tolerates missing drawing operands', () => {
		expect(
			inspectDrawings({
				fnArray: [OPS.setLineWidth, OPS.transform, OPS.setStrokeRGBColor, OPS.constructPath],
				argsArray: [[], [], [], [OPS.stroke, null, [0, 0, 20, 0.5]]],
			}),
		).toStrictEqual({
			horizontalStrokes: [{ x: 0, y: 0, width: 20, height: 0.5, lineWidth: 1 }],
			yellowFills: [],
			tableLines: [],
		})
	})

	test('applies transforms to horizontal strokes', () => {
		const result = inspectDrawings({
			fnArray: [
				OPS.save,
				OPS.transform,
				OPS.setLineWidth,
				OPS.setStrokeRGBColor,
				OPS.constructPath,
				OPS.restore,
			],
			argsArray: [
				[],
				[2, 0, 0, 2, 10, 20, NaN],
				[0.5],
				[0, 0, 0, NaN],
				[OPS.stroke, null, [0, 0, 20, 0.5, NaN]],
				[],
			],
		})

		expect(result.horizontalStrokes).toStrictEqual([{ x: 10, y: 20, width: 40, height: 1, lineWidth: 0.5 }])
	})

	test('classifies yellow fills', () => {
		const result = inspectDrawings({
			fnArray: [OPS.setFillRGBColor, OPS.constructPath],
			argsArray: [
				[1, 0.9, 0.1, NaN],
				[OPS.fill, null, [5, 5, 25, 15]],
			],
		})

		expect(result.yellowFills).toStrictEqual([{ x: 5, y: 5, width: 20, height: 10 }])
	})

	test('classifies table lines', () => {
		const result = inspectDrawings({
			fnArray: [OPS.setFillRGBColor, OPS.constructPath],
			argsArray: [
				[0.8, 0.8, 0.8],
				[OPS.fill, null, [0, 0, 520, 1]],
			],
		})

		expect(result.tableLines).toStrictEqual([{ x: 0, y: 0, width: 520, height: 1 }])
	})

	test('rejects short, non-finite, and unsupported path bounds', () => {
		const result = inspectDrawings({
			fnArray: [OPS.constructPath, OPS.constructPath, OPS.constructPath, OPS.constructPath],
			argsArray: [
				[OPS.stroke, null, [0, 0, 20]],
				[OPS.stroke, null, [0, 0, Infinity, 0.5]],
				[OPS.stroke, null, new Float64Array([0, 0, 20, 0.5])],
				[OPS.stroke, null, [0, 0, 20, 0.5]],
			],
		})

		expect(result.horizontalStrokes).toStrictEqual([{ x: 0, y: 0, width: 20, height: 0.5, lineWidth: 1 }])
	})

	test('preserves graphics state when malformed operands are rejected', () => {
		const result = inspectDrawings({
			fnArray: [
				OPS.transform,
				OPS.transform,
				OPS.setLineWidth,
				OPS.setLineWidth,
				OPS.setStrokeRGBColor,
				OPS.setStrokeRGBColor,
				OPS.constructPath,
			],
			argsArray: [
				[2, 0, 0, 2, 10, 20],
				[1, 0, 0, 1, 30],
				[0.5],
				[Infinity],
				[0, 0, 0],
				[NaN, 0, 0],
				[OPS.stroke, null, [0, 0, 20, 0.5]],
			],
		})

		expect(result.horizontalStrokes).toStrictEqual([{ x: 10, y: 20, width: 40, height: 1, lineWidth: 0.5 }])
	})

	test('requires exact hex color operands while numeric colors use their prefix', () => {
		const result = inspectDrawings({
			fnArray: [OPS.setFillRGBColor, OPS.setFillRGBColor, OPS.constructPath],
			argsArray: [
				[1, 0.9, 0.1, NaN],
				['#cccccc', 'ignored'],
				[OPS.fill, null, [0, 0, 520, 10]],
			],
		})

		expect(result.yellowFills).toStrictEqual([{ x: 0, y: 0, width: 520, height: 10 }])
		expect(result.tableLines).toStrictEqual([])
	})

	test('accepts typed path bounds emitted by PDF.js', () => {
		const result = inspectDrawings({
			fnArray: [OPS.setFillRGBColor, OPS.constructPath],
			argsArray: [['#cccccc'], [OPS.fill, null, new Float32Array([0, 0, 520, 1])]],
		})

		expect(result.tableLines).toStrictEqual([{ x: 0, y: 0, width: 520, height: 1 }])
	})
})
