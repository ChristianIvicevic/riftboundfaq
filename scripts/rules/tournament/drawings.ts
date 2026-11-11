import { Option, Schema, SchemaTransformation } from 'effect'
import { OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PdfOperatorList } from '../pdf'

const BLACK_THRESHOLD = 0.08
const YELLOW_RED_MINIMUM = 0.9
const YELLOW_GREEN_MINIMUM = 0.75
const YELLOW_BLUE_MAXIMUM = 0.25

const finiteNumber = Schema.Finite
const matrixTuple = Schema.mutable(
	Schema.Tuple([finiteNumber, finiteNumber, finiteNumber, finiteNumber, finiteNumber, finiteNumber]),
)
const boundsTuple = Schema.mutable(Schema.Tuple([finiteNumber, finiteNumber, finiteNumber, finiteNumber]))
const numericColorTuple = Schema.mutable(Schema.Tuple([finiteNumber, finiteNumber, finiteNumber]))

type Matrix = typeof matrixTuple.Type
type Bounds = typeof boundsTuple.Type
type Color = typeof numericColorTuple.Type

function slicePrefix<Tuple extends unknown[]>(value: ArrayLike<unknown>, length: number): Tuple {
	// SAFETY: Schema.decodeTo immediately validates the returned prefix with its fixed tuple schema.
	return Array.from(value).slice(0, length) as Tuple
}

const matrixValue = Schema.Array(Schema.Unknown).pipe(
	Schema.decodeTo(
		matrixTuple,
		SchemaTransformation.transform({
			decode: (value) => slicePrefix<Matrix>(value, 6),
			encode: (value) => value,
		}),
	),
)
const boundsValue = Schema.Union([Schema.Array(Schema.Unknown), Schema.instanceOf(Float32Array)]).pipe(
	Schema.decodeTo(
		boundsTuple,
		SchemaTransformation.transform({
			decode: (value) => slicePrefix<Bounds>(value, 4),
			encode: (value) => value,
		}),
	),
)
const numericColorValue = Schema.Array(Schema.Unknown).pipe(
	Schema.decodeTo(
		numericColorTuple,
		SchemaTransformation.transform({
			decode: (value) => slicePrefix<Color>(value, 3),
			encode: (value) => value,
		}),
	),
)
const hexColorValue = Schema.mutable(
	Schema.Tuple([Schema.String.check(Schema.isPattern(/^#[\dA-Fa-f]{6}$/u))]),
)
const decodeFiniteNumber = Schema.decodeUnknownOption(finiteNumber)
const decodeMatrix = Schema.decodeUnknownOption(matrixValue)
const decodeBounds = Schema.decodeUnknownOption(boundsValue)
const decodeNumericColor = Schema.decodeUnknownOption(numericColorValue)
const decodeHexColor = Schema.decodeUnknownOption(hexColorValue)

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
	const hexColor = decodeHexColor(arguments_)
	if (Option.isSome(hexColor)) {
		const hex = hexColor.value[0].slice(1)
		return [
			Number.parseInt(hex.slice(0, 2), 16) / 255,
			Number.parseInt(hex.slice(2, 4), 16) / 255,
			Number.parseInt(hex.slice(4, 6), 16) / 255,
		]
	}
	const numericColor = decodeNumericColor(arguments_)
	return Option.isSome(numericColor) ? numericColor.value : null
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

export function inspectDrawings(operatorList: PdfOperatorList): DrawingInspection {
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
			const matrix = decodeMatrix(operands)
			if (Option.isSome(matrix)) transform = multiply(transform, matrix.value)
		} else if (operation === OPS.setLineWidth) {
			const parsedLineWidth = decodeFiniteNumber(operands[0])
			if (Option.isSome(parsedLineWidth)) lineWidth = parsedLineWidth.value
		} else if (operation === OPS.setStrokeRGBColor) {
			strokeColor = rgb(operands) ?? strokeColor
		} else if (operation === OPS.setFillRGBColor) {
			fillColor = rgb(operands) ?? fillColor
		} else if (operation === OPS.constructPath) {
			const rawBounds = decodeBounds(operands[2])
			if (Option.isNone(rawBounds)) continue
			const paintOperation = decodeFiniteNumber(operands[0])
			const bounds = transformedBounds(rawBounds.value, transform)
			const strokes =
				Option.isSome(paintOperation) &&
				[OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke].includes(paintOperation.value)
			const fills = [
				OPS.fill,
				OPS.eoFill,
				OPS.fillStroke,
				OPS.eoFillStroke,
				OPS.closeFillStroke,
				OPS.closeEOFillStroke,
			].includes(Option.isSome(paintOperation) ? paintOperation.value : -1)

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
