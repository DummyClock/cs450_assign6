import React, { Component } from "react";
import "./App.css";
import FileUpload from "./FileUpload";
import * as d3 from 'd3';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data:[],
      selected_data:[],
      sentimentColors : { positive: "green", negative: "red", neutral: "gray" }
    };
  }
  componentDidMount(){
    this.renderChart()
  }
  componentDidUpdate(){
    this.renderChart()
  }
  set_data = (csv_data) => {
    //this.setState({ data: csv_data });
    console.log("Data received from FileUpload:", csv_data);
        this.setState({ data: csv_data }, () => {
            // Call renderChart after the state has been updated
            this.renderChart();
        });
  }

  renderChart=()=>{
    const { data } = this.state;
    var margin ={left:50,right:150,top:10,bottom:10},
      width = 500, height=300;
    var innerWidth = width - margin.left - margin.right
    var innerHeight = height - margin.top - margin.bottom

    const svg = d3.select(".container")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    //const streamGraph = svg.selectAll(".streamGraph").data([null]).join("g").attr("class", "streamGraph").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const chartGroup = svg.selectAll(".chartGroup")
      .data([null])
      .join("g")
      .attr("class", "chartGroup")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const labels = ["GPT-4","Gemini","PaLM-2","Claude","LLaMA-3.1"]
    const maxSum = d3.sum([
      d3.max(data, d=> d["GPT-4"]),
      d3.max(data, d=> d.Gemini),
      d3.max(data, d=> d["PaLM-2"]),
      d3.max(data, d=> d.Claude),
      d3.max(data, d=> d["LLaMA-3.1"]),
    ])

    // Prevents legend from appearing if no valid data is present
    if(!maxSum) return

    // Scales
    const colorScale = d3.scaleOrdinal()
      .domain(labels)
      .range(["red", "blue", "green", "purple", "orange"])
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d=>d.Date))
      .range([0,innerWidth])
    const yScale = d3.scaleLinear()
      .domain([0, maxSum])
      .range([innerHeight, 0]);

    // Generate series/objects to stack
    var stackGenerator = d3.stack().keys(labels).offset(d3.stackOffsetSilhouette)
    var stackSeries = stackGenerator(data)

    // Generate paths to draw later
    var areaGen = d3.area().x(d=>xScale(d.data.Date))
                           .y0(d => yScale(d[0]))
                           .y1(d => yScale(d[1]))
    console.log(areaGen)
    
    // Draw paths stored in areaGen
    chartGroup.selectAll(".myareachart")
      .data(stackSeries)
      .join("path")
      .attr("class", "myareachart")
      .attr("d", areaGen)
      .attr("fill", d => colorScale(d.key))
      .attr("transform", `translate(0,-120)`)
      

    // X-axis Draw
    chartGroup.selectAll(".x-axis").data([null]).join("g").attr("class", "x-axis").attr("transform", `translate(0, ${innerHeight})`).call(d3.axisBottom(xScale).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b")));

    // Append Legend
    //d3.select(".legend").data(this.state.data)
       //.append("g").join("rect").attr("fill", d=>colorScale(d.key))

      const legend = d3.select(".legend");
      legend.selectAll("*").remove(); // clear existing

      const legendGroup = legend.append("g").attr("transform", "translate(10,60)");

      labels.reverse().forEach((llm, i) => {
        const g = legendGroup.append("g").attr("transform", `translate(0, ${i * 20})`);
        g.append("rect")
          .attr("width", 15)
          .attr("height", 15)
          .attr("fill", colorScale(llm));
        g.append("text")
          .attr("x", 20)
          .attr("y", 12)
          .text(llm)
          .style("font-size", "12px");
      });

    // Tooltips
// Tooltip setup
const tooltip = d3.selectAll(".tooltip").data([0])
  .join("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .style("background-color", "white")
  .style("position", "absolute")
  .style("border", "1px solid gray")
  .style("border-radius", "5px")
  .style("padding", "5px")
  .style("pointer-events", "none");

const tooltipWidth = 350;
const tooltipHeight = 150;

// Attach hover events to each streamgraph layer
chartGroup.selectAll(".myareachart")
  .on("mouseover", function (event, d) {
    tooltip.style("opacity", 1);
  })
  .on("mousemove", function (event, d) {
    const llmKey = d.key;

    // Extract all months and values for the hovered LLM
    const barData = data.map(datum => ({
      month: d3.timeFormat("%b")(datum.Date),  // e.g. "Jan"
      value: +datum[llmKey]
    }));

    // Clear and position tooltip
    tooltip.html("")
      .style("left", `${event.pageX + 10}px`)
      .style("top", `${event.pageY - tooltipHeight - 10}px`);

    const svg = tooltip.append("svg")
      .attr("width", tooltipWidth)
      .attr("height", tooltipHeight);

    // X and Y scales
    const xScaleBar = d3.scaleBand()
      .domain(barData.map(d => d.month))
      .range([40, tooltipWidth - 10])
      .padding(0.1);

    const yScaleBar = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.value)])
      .range([tooltipHeight - 30, 20]);

    // Bars
    svg.selectAll("rect")
      .data(barData)
      .join("rect")
      .attr("x", d => xScaleBar(d.month))
      .attr("y", d => yScaleBar(d.value))
      .attr("width", xScaleBar.bandwidth())
      .attr("height", d => tooltipHeight - 30 - yScaleBar(d.value))
      .attr("fill", colorScale(llmKey));

    // X-axis
    svg.append("g")
      .attr("transform", `translate(0, ${tooltipHeight - 30})`)
      .call(d3.axisBottom(xScaleBar))
      .selectAll("text")
      .style("font-size", "10px");

    // Y-axis
    svg.append("g")
      .attr("transform", "translate(30,0)")      // This controls the vertical position of the Axis
      .call(d3.axisLeft(yScaleBar));


    // Tooltip title
    svg.append("text")
      .attr("x", tooltipWidth / 2)
      .attr("y", 12)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text(`${llmKey}`);
  })
  .on("mouseleave", () => {
    tooltip.style("opacity", 0);
  });



  }
  render() {
    console.log(this.state.data)
    return (
      <div>
        <FileUpload set_data={this.set_data}></FileUpload>
        <div className="parent">
          <svg className="container"></svg>
          <svg className="legend"></svg>
        </div>
        <div className="tooltip"></div>
      </div>
    );
  }
}

export default App;
