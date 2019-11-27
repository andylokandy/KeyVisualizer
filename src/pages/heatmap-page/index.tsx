import React, { useState, useEffect } from "react"
import style from "./styles.scss"
import ReactDOM from "react-dom"
import { Heatmap, HeatmapData } from "~/components/heatmap"
import { fetchHeatmap, fetchDummyHeatmap } from "~api"

export const HeatmapPage: React.FunctionComponent = props => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData>()

  useEffect(() => {
    const load = async () => {
      if (!heatmapData) setHeatmapData(await fetchDummyHeatmap())
    }
    load()
  })

  return (
    <>
      {heatmapData && (
        <Heatmap
          data={heatmapData}
          onBrush={range => console.log(range)}
        />
      )}
    </>
  )
}
