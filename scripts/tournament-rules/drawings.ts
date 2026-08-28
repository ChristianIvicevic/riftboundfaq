import { OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { z } from 'zod'

const BLACK_THRESHOLD = 0.08
const YELLOW_RED_MINIMUM = 0.9
const YELLOW_GREEN_MINIMUM = 0.75
const YELLOW_BLUE_MAXIMUM = 0.25

const finiteNumber = z.number()
const matrixValue = z
	.array(z.unknown())
	.transform((value) => value.slice(0, 6))
	.pipe(z.tuple([finiteNumber, finiteNumber, finiteNumber, finiteNumber, finiteNumber, finiteNumber]))
const boundsValue = z
	.union([z.array(z.unknown()), z.instanceof(Float32Array)])
	.transform((value) => Array.from(value).slice(0, 4))
	.pipe(z.tuple([finiteNumber, finiteNumber, finiteNumber, finiteNumber]))
const numericColorValue = z
	.array(z.unknown())
	.transform((value) => value.slice(0, 3))
	.pipe(z.tuple([finiteNumber, finiteNumber, finiteNumber]))
const hexColorValue = z.tuple([z.string().regex(/^#[\dA-Fa-f]{6}$/u)])

type Matrix = z.infer<typeof matrixValue>
type Bounds = z.infer<typeof boundsValue>
type Color = z.infer<typeof numericColorValue>

export type DrawingBounds = {
	x: number
	y: number
	width: number
	height: number
}

export type DrawingStroke = DrawingBounds & { lineWidth: number }

export type DrawingInspection = {
	horizontalStrokes: DrawingStroke[]
	yellowFills: DrawingBounds[]
	tableLines: DrawingBounds[]
}

type GraphicsState = {
	transform: Matrix
	strokeColor: Color
	fillColor: Color
	lineWidth: number
}

type PDFOperatorList = {
	fnArray: number[]
	argsArray: unknown[][]
}

function multiply(left: Matrix, right: Matrix): Matrix {
	return [
		left[0] * right[0] + left[2] * right[1],
		left[1] * right[0] + left[3] * right[1],
		left[0] * right[2] + left[2] * right[3],
		left[1] * right[2] + left[3] * right[3],
		left[0] * right[4] + left[2] * right[5] + left[4],
		left[1] * right[4] + left[3] * right[5] + left[5],
	]
}

function transformPoint(matrix: Matrix, x: number, y: number): [number, number] {
	return [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]]
}

function transformedBounds(bounds: Bounds, matrix: Matrix): DrawingBounds {
	const [left, bottom, right, top] = bounds
	const points = [
		transformPoint(matrix, left, bottom),
		transformPoint(matrix, left, top),
		transformPoint(matrix, right, bottom),
		transformPoint(matrix, right, top),
	]
	const xs = points.map(([x]) => x)
	const ys = points.map(([, y]) => y)
	return {
		x: Math.min(...xs),
		y: Math.min(...ys),
		width: Math.max(...xs) - Math.min(...xs),
		height: Math.max(...ys) - Math.min(...ys),
	}
}

function rgb(arguments_: unknown[]): Color | null {
	const hexColor = hexColorValue.safeParse(arguments_)
	if (hexColor.success) {
		const hex = hexColor.data[0].slice(1)
		return [
			Number.parseInt(hex.slice(0, 2), 16) / 255,
			Number.parseInt(hex.slice(2, 4), 16) / 255,
			Number.parseInt(hex.slice(4, 6), 16) / 255,
		]
	}
	const numericColor = numericColorValue.safeParse(arguments_)
	return numericColor.success ? numericColor.data : null
}

function isBlack(color: Color): boolean {
	return color.every((channel) => channel <= BLACK_THRESHOLD)
}

function isBrightYellow(color: Color): boolean {
	return color[0] >= YELLOW_RED_MINIMUM && color[1] >= YELLOW_GREEN_MINIMUM && color[2] <= YELLOW_BLUE_MAXIMUM
}

function isTableGray(color: Color): boolean {
	return Math.max(...color) - Math.min(...color) < 0.03 && color[0] >= 0.75 && color[0] <= 0.95
}

export function inspectDrawings(operatorList: PDFOperatorList): DrawingInspection {
	let transform: Matrix = [1, 0, 0, 1, 0, 0]
	let strokeColor: Color = [0, 0, 0]
	let fillColor: Color = [0, 0, 0]
	let lineWidth = 1
	const stack: GraphicsState[] = []
	const horizontalStrokes: DrawingStroke[] = []
	const yellowFills: DrawingBounds[] = []
	const tableLines: DrawingBounds[] = []

	for (let index = 0; index < operatorList.fnArray.length; index++) {
		const operation = operatorList.fnArray[index]
		const operands = operatorList.argsArray[index] ?? []
		if (operation === OPS.save) {
			stack.push({ transform, strokeColor, fillColor, lineWidth })
		} else if (operation === OPS.restore) {
			const savedState = stack.pop()
			if (savedState) ({ transform, strokeColor, fillColor, lineWidth } = savedState)
		} else if (operation === OPS.transform) {
			const matrix = matrixValue.safeParse(operands)
			if (matrix.success) transform = multiply(transform, matrix.data)
		} else if (operation === OPS.setLineWidth) {
			const parsedLineWidth = finiteNumber.safeParse(operands[0])
			if (parsedLineWidth.success) lineWidth = parsedLineWidth.data
		} else if (operation === OPS.setStrokeRGBColor) {
			strokeColor = rgb(operands) ?? strokeColor
		} else if (operation === OPS.setFillRGBColor) {
			fillColor = rgb(operands) ?? fillColor
		} else if (operation === OPS.constructPath) {
			const rawBounds = boundsValue.safeParse(operands[2])
			if (!rawBounds.success) continue
			const paintOperation = finiteNumber.safeParse(operands[0])
			const bounds = transformedBounds(rawBounds.data, transform)
			const strokes =
				paintOperation.success &&
				[OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke].includes(paintOperation.data)
			const fills = [
				OPS.fill,
				OPS.eoFill,
				OPS.fillStroke,
				OPS.eoFillStroke,
				OPS.closeFillStroke,
				OPS.closeEOFillStroke,
			].includes(paintOperation.success ? paintOperation.data : -1)

			if (strokes && isBlack(strokeColor) && bounds.width > 12 && bounds.height < 2.5) {
				horizontalStrokes.push({ ...bounds, lineWidth })
				if (bounds.width > 500) tableLines.push(bounds)
			}
			if (fills && isBrightYellow(fillColor) && bounds.width > 4 && bounds.height > 3) {
				yellowFills.push(bounds)
			}
			if (fills && isTableGray(fillColor) && bounds.width > 500 && bounds.height <= 2) {
				tableLines.push(bounds)
			}
		}
	}

	return { horizontalStrokes, yellowFills, tableLines }
}
