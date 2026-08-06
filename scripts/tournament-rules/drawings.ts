import { OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'

const BLACK_THRESHOLD = 0.08
const YELLOW_RED_MINIMUM = 0.9
const YELLOW_GREEN_MINIMUM = 0.75
const YELLOW_BLUE_MAXIMUM = 0.25

type Matrix = [number, number, number, number, number, number]
type Bounds = [number, number, number, number] | Float32Array
type Color = [number, number, number]

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

function isMatrix(value: unknown): value is Matrix {
	return (
		Array.isArray(value) &&
		value.length >= 6 &&
		value.slice(0, 6).every((entry) => typeof entry === 'number' && Number.isFinite(entry))
	)
}

function isBounds(value: unknown): value is Bounds {
	return (
		(Array.isArray(value) || value instanceof Float32Array) &&
		value.length >= 4 &&
		value.slice(0, 4).every((entry) => typeof entry === 'number' && Number.isFinite(entry))
	)
}

function rgb(arguments_: unknown[]): Color | null {
	if (
		arguments_.length === 1 &&
		typeof arguments_[0] === 'string' &&
		/^#[\dA-Fa-f]{6}$/u.test(arguments_[0])
	) {
		const hex = arguments_[0].slice(1)
		return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) as Color
	}
	if (
		arguments_.length >= 3 &&
		arguments_.slice(0, 3).every((entry) => typeof entry === 'number' && Number.isFinite(entry))
	) {
		return arguments_.slice(0, 3) as Color
	}
	return null
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
		} else if (operation === OPS.transform && isMatrix(operands)) {
			transform = multiply(transform, operands)
		} else if (
			operation === OPS.setLineWidth &&
			typeof operands[0] === 'number' &&
			Number.isFinite(operands[0])
		) {
			lineWidth = operands[0]
		} else if (operation === OPS.setStrokeRGBColor) {
			strokeColor = rgb(operands) ?? strokeColor
		} else if (operation === OPS.setFillRGBColor) {
			fillColor = rgb(operands) ?? fillColor
		} else if (operation === OPS.constructPath && isBounds(operands[2])) {
			const [paintOperation, , rawBounds] = operands
			const bounds = transformedBounds(rawBounds, transform)
			const strokes =
				typeof paintOperation === 'number' &&
				[OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke].includes(paintOperation)
			const fills = [
				OPS.fill,
				OPS.eoFill,
				OPS.fillStroke,
				OPS.eoFillStroke,
				OPS.closeFillStroke,
				OPS.closeEOFillStroke,
			].includes(typeof paintOperation === 'number' ? paintOperation : -1)

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
