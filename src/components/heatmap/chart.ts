import * as d3 from "d3"
import _ from "lodash"
import { HeatmapRange, HeatmapData, KeyAxisEntry } from "."
import { createBuffer } from "./buffer"
import { labelAxisGroup } from "./label-axis"

const margin = {
  top: 25,
  right: 25,
  bottom: 60,
  left: 100,
}

export function heatmapChart(onBrush: (range: HeatmapRange) => void) {
  var data: HeatmapData
  var brightness = 1
  var bufferCanvas: HTMLCanvasElement
  var zoomTransform = d3.zoomIdentity
  var isBrushing = false
  var width = 0
  var height = 0
  var canvasWidth = 0
  var canvasHeight = 0
  const MSAARatio = 4

  heatmapChart.data = function(newData: HeatmapData) {
    data = newData
    bufferCanvas = createBuffer(data.values, brightness)
  }

  heatmapChart.brightness = function(newBrightness: number) {
    brightness = newBrightness
    bufferCanvas = createBuffer(data.values, brightness)
  }

  heatmapChart.size = function(newWidth, newHeight) {
    const newCanvasWidth = newWidth - margin.left - margin.right
    const newCanvasHeight = newHeight - margin.left - margin.right
    // Sync transform on resize
    if (canvasWidth != 0 && canvasHeight != 0) {
      zoomTransform = d3.zoomIdentity
        .translate(
          (zoomTransform.x * newCanvasWidth) / canvasWidth,
          (zoomTransform.y * newCanvasHeight) / canvasHeight
        )
        .scale(zoomTransform.k)
    }
    
    width = newWidth
    height = newHeight
    canvasWidth = newCanvasWidth
    canvasHeight = newCanvasHeight
  }

  heatmapChart.startBrush = function() {
    isBrushing = true
  }

  function heatmapChart(container) {
    let tooltips = container.selectAll("div").data([null])

    tooltips = tooltips
      .enter()
      .append("div")
      .style("position", "absolute")
      .merge(tooltips)
      .style("width", width + "px")
      .style("height", height + "px")

    let axis = container.selectAll("svg").data([null])

    axis = axis
      .enter()
      .append("svg")
      .style("position", "absolute")
      .merge(axis)
      .style("width", width + "px")
      .style("height", height + "px")

    let canvas = container.selectAll("canvas").data([null])

    canvas = canvas
      .enter()
      .append("canvas")
      .merge(canvas)
      .attr("width", canvasWidth * MSAARatio)
      .attr("height", canvasHeight * MSAARatio)
      .style("width", canvasWidth + "px")
      .style("height", canvasHeight + "px")
      .style("margin-top", margin.top + "px")
      .style("margin-right", margin.right + "px")
      .style("margin-bottom", margin.bottom + "px")
      .style("margin-left", margin.left + "px")

    const ctx = canvas.node().getContext("2d")
    ctx.imageSmoothingEnabled = false

    const xScale = d3
      .scaleLinear()
      .domain([0, data.timeAxis.length - 2])
      .range([0, canvasWidth])

    const yScale = d3
      .scaleLinear()
      .domain([0, data.keyAxis.length - 2])
      .range([0, canvasHeight])

    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat(idx =>
        data.timeAxis[idx] !== undefined
          ? d3.timeFormat("%B %d, %Y %H:%M:%S")(
              new Date(data.timeAxis[idx] * 1000)
            )
          : ""
      )
      .ticks(width / 270)

    const yAxis = d3
      .axisRight(yScale)
      .tickFormat(idx =>
        data.keyAxis[idx] !== undefined ? data.keyAxis[idx].key : ""
      )
      .ticks(10)

    const labelAxis = labelAxisGroup(data.keyAxis, yScale)

    let xAxisSvg = axis.selectAll("g.x-axis").data([null])

    xAxisSvg = xAxisSvg
      .enter()
      .append("g")
      .classed("x-axis", true)
      .merge(xAxisSvg)
      .attr("transform", "translate(" + margin.left + "," + (height - 20) + ")")

    let yAxisSvg = axis.selectAll("g.y-axis").data([null])

    yAxisSvg = yAxisSvg
      .enter()
      .append("g")
      .classed("y-axis", true)
      .merge(yAxisSvg)
      .attr("transform", "translate(0, " + margin.top + ")")

    let labelAxisSvg = axis.selectAll("g.label-axis").data([null])

    labelAxisSvg = labelAxisSvg
      .enter()
      .append("g")
      .classed("label-axis", true)
      .merge(labelAxisSvg)
      .attr("transform", "translate(20, " + margin.top + ")")

    d3.zoom().transform(axis, zoomTransform)

    const zoomBehavior = d3
      .zoom()
      .scaleExtent([1, 64])
      .translateExtent([
        [0, 0],
        [canvasWidth, canvasHeight],
      ])
      .extent([
        [0, 0],
        [canvasWidth, canvasHeight],
      ])
      .on("zoom", zoomed)
      .on("start", zoomStart)

    function zoomStart() {
      if (
        d3.event.sourceEvent ? d3.event.sourceEvent.type == "mousedown" : false
      ) {
        hideTooltips()
      }
    }

    function zoomed() {
      zoomTransform = d3.event.transform
      render()
    }

    function hoverBehavior(axis) {
      axis.on("mousemove", mousemove)
      axis.on("mouseout", hideTooltips)
      function mousemove() {
        const mouseTooltipOffset = d3.mouse(tooltips.node())
        const mouseCanvasOffset = d3.mouse(canvas.node())

        if (d3.event.movementX == 0 && d3.event.movementY == 0) return

        if (
          mouseCanvasOffset[0] < 0 ||
          mouseCanvasOffset[0] > canvasWidth ||
          mouseCanvasOffset[1] < 0 ||
          mouseCanvasOffset[1] > canvasHeight
        ) {
          hideTooltips()
          return
        }

        const rescaleX = zoomTransform.rescaleX(xScale)
        const rescaleY = zoomTransform.rescaleY(yScale)
        const timeIdx = Math.floor(rescaleX.invert(mouseCanvasOffset[0]))
        const keyIdx = Math.floor(rescaleY.invert(mouseCanvasOffset[1]))

        // Refactor Me
        const tooltipData = [
          {
            name: "Value",
            value: data.values[timeIdx][keyIdx],
          },
          {
            name: "Start Time",
            value: d3.timeFormat("%B %d, %Y %H:%M:%S")(
              new Date(data.timeAxis[timeIdx] * 1000)
            ),
          },
          {
            name: "End Time",
            value: data.timeAxis[timeIdx + 1]
              ? d3.timeFormat("%B %d, %Y %H:%M:%S")(
                  new Date(data.timeAxis[timeIdx + 1] * 1000)
                )
              : "",
          },
          {
            name: "Start Key",
            value: data.keyAxis[keyIdx].key,
          },
          {
            name: "End Key",
            value: data.keyAxis[keyIdx + 1] ? data.keyAxis[keyIdx + 1].key : "",
          },
        ]

        let tooltipDiv = tooltips.selectAll("div").data([null])

        tooltipDiv = tooltipDiv
          .enter()
          .append("div")
          .style("position", "absolute")
          .style("background-color", "#333")
          .style("color", "#eee")
          .style("padding", "5px")
          .merge(tooltipDiv)
          .style("left", mouseTooltipOffset[0] + 20 + "px")
          .style("top", mouseTooltipOffset[1] + 20 + "px")

        const tooltipEntries = tooltipDiv.selectAll("p").data(tooltipData)

        tooltipEntries
          .enter()
          .append("p")
          .style("font-size", "12px")
          .merge(tooltipEntries)
          .text(d => d.value)

        tooltipEntries.exit().remove()
        tooltipDiv.exit().remove()
      }
    }

    function hideTooltips() {
      tooltips.selectAll("div").remove()
    }

    if (isBrushing) {
      const brush = d3
        .brush()
        .extent([
          [0, 0],
          [canvasWidth, canvasHeight],
        ])
        .on("start", brushStart)
        .on("end", brushEnd)

      let brushSvg = axis.selectAll("g.brush").data([null])

      brushSvg = brushSvg
        .enter()
        .append("g")
        .classed("brush", true)
        .merge(brushSvg)
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .call(brush)

      function brushStart() {
        hideTooltips()
      }

      function brushEnd() {
        brushSvg.remove()
        isBrushing = false

        const selection = d3.event.selection
        if (selection) {
          brush.clear(brushSvg)
          const domainTopLeft = zoomTransform.invert(selection[0])
          const domainBottomRight = zoomTransform.invert(selection[1])
          const startTime =
            data.timeAxis[Math.round(xScale.invert(domainTopLeft[0]))]
          const endTime =
            data.timeAxis[Math.round(xScale.invert(domainBottomRight[0]))]
          const startKey =
            data.keyAxis[Math.round(yScale.invert(domainTopLeft[1]))].key
          const endKey =
            data.keyAxis[Math.round(yScale.invert(domainBottomRight[1]))].key

          onBrush({
            startTime: startTime,
            endTime: endTime,
            startKey: startKey,
            endKey: endKey,
          })
        }
      }
    }

    axis.call(zoomBehavior)
    axis.call(hoverBehavior)

    function render() {
      const rescaleX = zoomTransform.rescaleX(xScale)
      const rescaleY = zoomTransform.rescaleY(yScale)

      xAxisSvg.call(xAxis.scale(rescaleX))
      // yAxisSvg.call(yAxis.scale(rescaleY))
      hideTicksWithoutLabel()

      labelAxisSvg.call(labelAxis.scale(rescaleY))

      ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      ctx.drawImage(
        bufferCanvas,
        xScale.invert(zoomTransform.invertX(0)),
        yScale.invert(zoomTransform.invertY(0)),
        xScale.invert(canvasWidth * (1 / zoomTransform.k)),
        yScale.invert(canvasHeight * (1 / zoomTransform.k)),
        0,
        0,
        canvasWidth * MSAARatio,
        canvasHeight * MSAARatio
      )
    }

    function hideTicksWithoutLabel() {
      axis.selectAll(".tick text").each(function() {
        if (this.innerHTML === "") {
          this.parentNode.style.display = "none"
        }
      })
    }

    render()
  }

  return heatmapChart
}
