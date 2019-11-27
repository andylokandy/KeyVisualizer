import React, { RefObject, useRef, useCallback, useEffect } from "react"
import * as d3 from "d3"
import _ from "lodash"
import { heatmapChart } from "./chart"

export type HeatmapRange = {
  startTime?: number
  endTime?: number
  startKey?: string
  endKey?: string
}

export type KeyAxisEntry = {
  key: string
  labels: string[]
}

export type HeatmapData = {
  timeAxis: number[]
  keyAxis: KeyAxisEntry[]
  values: number[][]
}

type HeatmapProps = {
  data: HeatmapData
  onBrush: (selection: HeatmapRange) => void
}

export const Heatmap: React.FunctionComponent<HeatmapProps> = props => {
  const divRef: React.RefObject<HTMLDivElement> = useRef(null)
  var chart

  useEffect(() => {
    chart = heatmapChart(props.onBrush)
    chart.data(props.data)
  }, [props.data])

  useEffect(() => {
    if (divRef.current != null) {
      const container = divRef.current
      const render = () => {
        const width = container.offsetWidth
        const height = container.offsetHeight
        chart.size(width, height)
        chart(d3.select(container))
      }
      window.onresize = render
      render()
    }
  }, [props])

  const onZoomClick = useCallback(() => {
    if (divRef.current != null) {
      chart.startBrush()
      chart(d3.select(divRef.current))
    }
  }, [props])

  return (
    <>
      <button style={{ margin: 20, display: "block" }} onClick={onZoomClick}>
        Zoom
      </button>
      <div ref={divRef} style={{ width: "100%", height: 700 }} />
    </>
  )
}
