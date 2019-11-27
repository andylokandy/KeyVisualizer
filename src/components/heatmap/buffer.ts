import * as d3 from "d3"

export function createBuffer(values: number[][], brightness: number) {
  const maxValue = d3.max(values.map(array => d3.max(array))) / brightness
  const logScale = d3.scaleSymlog().domain([0, maxValue])
  const colorScale = d3.scaleSequential(d => d3.interpolateInferno(logScale(d)))

  const valueWidth = values.length
  const valueHeight = (values[0] || []).length
  const canvas = d3
    .create("canvas")
    .attr("width", valueWidth)
    .attr("height", valueHeight)
    .node() as HTMLCanvasElement
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D
  const sourceImageData = ctx.createImageData(valueWidth, valueHeight)
  const imageData = sourceImageData.data

  for (var i = 0; i < imageData.length; i += 4) {
    const pixel = i / 4
    const x = pixel % valueWidth
    const y = Math.floor(pixel / valueWidth)
    const color = colorScale(values[x][y])

    imageData[i] = parseInt(color.substring(1, 3), 16) // R
    imageData[i + 1] = parseInt(color.substring(3, 5), 16) // G
    imageData[i + 2] = parseInt(color.substring(5, 7), 16) // B
    imageData[i + 3] = 255 // A
  }

  ctx.putImageData(sourceImageData, 0, 0)

  return canvas
}
