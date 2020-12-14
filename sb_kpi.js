/* json flat data format
   {  
      "project_number": "C1469", //string
      "project_title": "FRAC 1", //string
      "Location": "Mont Belvieu, TX",//string
      "tag_number": "100-CMM12.001",//string
      "initial_po_to_vendor": "10/25/2011",//date
      "po_ship_date": "7/22/2012",//date
      "field_receive_date": "8/31/2012",//date
      "work_pkg": 604,//num
      "equip_pkg_number": "REFRIG. COMPR.",//string
      "process_designation": "REFRIGERANT \nCOMPRESSOR MOTOR\nDRIVER",//string
      "equipment_type": "DRIVER",//string
      "Scope": "NEW",//string
      "mechanical_description": "INDUCTION ELECTRIC MOTOR\n--VFD\nVENDOR PACKAGE",//string
      "Driver#1": "100-CMM12.001",//string
      "motor_hp1": 14200,//num
      "driver_type1": "MOTOR",//string
      "RPM1": 1800,//num
      "Volts1": 6600,//num
      "SF1": 115,//num
      "Ph1": 3,//num
      "Hz1": 60,//num
      "Paint": "S",//string
      "paint_spec": "MFRSTD",//string
      "insulation_type": "NONE",//string
      "flow_diagram": "100-4200-5001",//string
      "PO#": "M0002",//string
      "Vendor": "DRESSER-RAND",//string
      "vendor_zip_code": 77042,
      "original_estimate": " $457,430.00 ",//num
      "current_cost": " $457,430.00 ",//num
      "estimate_variance": " $-   ",//null
      "variance_between_po_ship_date_and_field_receipt": " (6)",//num
      "variance_between_initial_po_and_po_ship_date": " (45)"//num
   }
*/
   

//# dc.js started
'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer */

// ### Create Chart Objects

// Create chart objects associated with the container elements identified by the css selector.
// Note: It is often a good idea to have these objects accessible at the global scope so that they can be modified or
// filtered by other page controls.
var yearlyBubbleChart = dc.bubbleChart('#yearly-bubble-chart');
var overOrUnderChart = dc.pieChart('#over-under-chart');
var quarterChart = dc.pieChart('#quarter-chart');
var projectNumberChart = dc.rowChart('#project-number-chart');
//var projectTitleChart = dc.rowChart('#project-title-chart');
var equipmentTypeSelect = dc.selectMenu('#equipment-type-select');
var motorHP1Select = dc.selectMenu('#motor-hp1-select');
var vendorSelect = dc.selectMenu('#vendor-select');
var materialSelect = dc.selectMenu('#material-select');
var processSelect = dc.selectMenu('#process-select');
var tagSelect = dc.selectMenu('#tag-select');
var pricebyTagChart = dc.barChart('#avg-tag-chart');
var sumProcessChart = dc.barChart('#sum-process-chart');
var avgPricebyEquipmentTypeChart = dc.barChart('#avg-equipment-type-chart');
var avgVendorChart = dc.barChart('#avg-vendor-chart');

var cumulativeCostMoveChart = dc.lineChart('#cumulative-monthly-move-chart');
var cumulativeCostVolumeChart = dc.barChart('#cumulative-cost-by-select');


//dynamic d3.js
d3.json("gitignoredata/mechanical-equipment-pricing.js", function(error, flat_data){
    if(error) { return console.log(error); } 
    var timeFormat = d3.time.format("%m/%d/%Y");
    var numberFormat = d3.format('d');
    var commaFormat = d3.format("0,000");

    flat_data.forEach(function (d) {

        function optionalStringFieldClean(field) {
            if (field && field.toString().length > 0) {
                return field.toString();
            }
            else {
                return "unknown (data missing)";
            }
        }
      function requiredFieldClean(d){
        //static cleaning
        if (d.field_receive_date && d.field_receive_date.length > 0) {
              // pre-calculate month and year for better performance
              d.field_receive_date_clean = timeFormat.parse(d.field_receive_date); //get date format
              d.month_full = d3.time.month(d.field_receive_date_clean); //date start with first day of a month
              d.month_clean = d.month_full.getMonth();
              d.year_clean = d3.time.year(d.field_receive_date_clean).getFullYear();

        }
        else {
              d.field_receive_date_clean = null;
              d.month_full = null;
              d.month_clean = null;
              d.year_clean = null;
        }
        if (d.current_cost && d.current_cost.length > 0) {
        d.current_cost_clean = parseFloat(d.current_cost.replace(/ /g, "").replace(/,/g,"").replace("$","")); // coerce to number
        }
        else {
            d.current_cost_clean = 0.0;
        }
        if (d.original_estimate && d.original_estimate.length > 0) {
        d.original_estimate_clean = parseFloat(d.original_estimate.replace(/ /g, "").replace(/,/g,"").replace("$","")); // coerce to number
        }
        else {
            d.original_estimate_clean = 0.0;
        }
      }
     
    requiredFieldClean(d);
    d.equipment_type_clean=optionalStringFieldClean(d.equipment_type);
    d.motor_hp1_clean=optionalStringFieldClean(d.motor_hp1);
    d.vendor_clean=optionalStringFieldClean(d.Vendor);
    d.material_clean=optionalStringFieldClean(d.Material);
    d.process_designation_clean=optionalStringFieldClean(d.process_designation);
    d.tag_number_clean=optionalStringFieldClean(d.tag_number);
    });

    function initMetrics(){ 
      //four main metrics on excel sheets, not used now as it's fast enough
      var actual_price_by_tag_metrics=d3.nest().key(function(d) { return d.tag_number; }).rollup(function(v) { return {
         actual_price_by_tag: d3.sum(v, function(d) { return  d.current_cost_clean; }),
    
      }; })
        .entries(flat_data);

     var cumulative_cost_by_process_metrics=d3.nest().key(function(d) { return d.process_designation; }).rollup(function(v) { return {
         cumulative_cost_by_process: d3.sum(v, function(d) { return  d.current_cost_clean; }),
    
      }; })
        .entries(flat_data);
       
    var avg_actual_price_by_equipment_type_metrics=d3.nest().key(function(d) { return d.equipment_type; }).rollup(function(v) { return {
         avg_actual_price_by_equipment_type: d3.mean(v, function(d) { return  d.current_cost_clean; }),
    
      }; })
        .entries(flat_data);


    var avg_cost_per_vendor_metrics=d3.nest().key(function(d) { return d.Vendor; }).rollup(function(v) { return {
         avg_cost_per_vendor: d3.mean(v, function(d) {  return d.current_cost_clean; }),
    
      }; })
        .entries(flat_data);
    };
   
    //var actual_price_by_tag_metrics_chart
    //initMetrics();

    //### Create Crossfilter Dimensions and Groups
    var eqndx = crossfilter(flat_data);
    var all = eqndx.groupAll();
   
    // Dimension by year
    var yearlyDimension = eqndx.dimension(function (d) {
        return d.year_clean;
    });
    
    // Dimension by full date
    var dateDimension = eqndx.dimension(function (d) {
        return d.field_receive_date_clean;
    });

    // Dimension by month
    var moveMonths = eqndx.dimension(function (d) {
        return d.month_full;   
    });
   
    // Group by total within month
    var monthlySumMoveGroup = moveMonths.group().reduceSum(function (d) {
        return d.current_cost_clean;
    });
    // scale down result to save space
    var volumeByMonthGroup = moveMonths.group().reduceSum(function (d) {
        return d.current_cost_clean/1000000;
    });

    var indexAvgByMonthGroup = moveMonths.group().reduce(
        function (p, v) {
            ++p.days;
            p.total += v.current_cost_clean;
            return p;
        },
        function (p, v) {
            --p.days;
            p.total -= v.current_cost_clean;
            return p;
        },
        function () {
            return {days: 0, total: 0};
        }
    );
   
    // Summarize volume by quarter
    var quarter = eqndx.dimension(function (d) {
        if (d.month_clean) {
            var month = d.month_clean;
            if (month <= 2) {
                return 'Q1';
            } else if (month > 2 && month <= 5) {
                return 'Q2';
            } else if (month > 5 && month <= 8) {
                return 'Q3';
            } else {
                return 'Q4';
            }
        }
    });
    var quarterGroup = quarter.group().reduceSum(function (d) {
        return d.current_cost_clean;
    });
    
   // Create categorical dimension
    var overOrUnder = eqndx.dimension(function (d) {
        return d.current_cost_clean > d.original_estimate_clean ? 'Under' : 'Over';
    });
    // Produce counts records in the dimension
    var overOrUnderGroup = overOrUnder.group();
    var yearlyPerformanceGroup = yearlyDimension.group().reduce(
        /* callback for when data is added to the current filter results */
        function (p, v) {
            ++p.count;
            p.actual_cost += v.current_cost_clean;
            p.original_estimate += v.original_estimate_clean;
            p.difference += v.current_cost_clean - v.original_estimate_clean;
            return p;
        },
        /* callback for when data is removed from the current filter results */
        function (p, v) {
            --p.count;
            p.actual_cost -= v.current_cost_clean;
            p.original_estimate -= v.original_estimate_clean;
            p.difference -= v.current_cost_clean - v.original_estimate_clean;
            return p;
        },
        /* initialize p */
        function () {
            return {
                count: 0,
                actual_cost: 0,
                original_estimate: 0,
                difference: 0
            };
        }
    );
    var  projectNumber = eqndx.dimension(function (d) {
    return  d.project_number+' ('+d.project_title+')';
    });
    var projectNumberGroup = projectNumber.group();


    var  equipmentType = eqndx.dimension(function (d) {
    return  d.equipment_type_clean;
    });
    var equipmentTypeGroup = equipmentType.group();


    var  motorHP1 = eqndx.dimension(function (d) {
    return  d.motor_hp1_clean;
    });
    var motorHP1Group = motorHP1.group();

    var  vendor = eqndx.dimension(function (d) {
    return  d.vendor_clean;
    });
    var vendorGroup = vendor.group();

    var  material = eqndx.dimension(function (d) {
    return  d.material_clean;
    });
    var materialGroup = material.group();

    var processDimension = eqndx.dimension(function (d) {
        return d.process_designation_clean; 
    });
    var processGroup = processDimension.group();
    var processSumGroup = processGroup.reduceSum(function(d) {
        return d.current_cost_clean;
    });

    var avgPricebyEquipmentTypeGroup = equipmentType.group().reduce(
        //do not use equipmentTypeGroup above
            function (p, v) {
              ++p.count;
              p.total += v.current_cost_clean;
              return p;
            },

            function (p, v) {
              --p.count;
              p.total -= v.current_cost_clean;
              return p;
            },

            function () {
              return {count: 0, total: 0};
            }
        );

    var avgVendorGroup = vendor.group().reduce(
         //do not use vendorGroup above
            function (p, v) {
              ++p.count;
              p.total += v.current_cost_clean;
              return p;
            },

            function (p, v) {
              --p.count;
              p.total -= v.current_cost_clean;
              return p;
            },

            function () {
              return {count: 0, total: 0};
            }
        );

    var tagDimension = eqndx.dimension(function (d) {
        return d.tag_number_clean; 
    });
    var tagGroup = tagDimension.group();
    var pricebyTagGroup = tagGroup.reduceSum(function(d) {
        return d.current_cost_clean;
    });
    var cumulativeCostGroup = yearlyDimension.group().reduceSum(function (d) {
        return d.current_cost_clean;
    });;

   
    //--------------------------------start KPI chart---------------------------------
    yearlyBubbleChart /* dc.bubbleChart('#yearly-bubble-chart', 'chartGroup') */
        // (_optional_) define chart width, `default = 200`
        .width(1000)
        // (_optional_) define chart height, `default = 200`
        .height(400)
        // (_optional_) define chart transition duration, `default = 750`
        .transitionDuration(1500)
        .margins({top: 25, right: 50, bottom: 50, left: 50})
        .dimension(yearlyDimension)
        //The bubble chart expects the groups are reduced to multiple values which are used
        //to generate x, y, and radius for each key (bubble) in the group
        .group(yearlyPerformanceGroup)
        // (_optional_) define color function or array for bubbles: [ColorBrewer](http://colorbrewer2.org/)
        .colors(colorbrewer.RdYlGn[9])
        //(optional) define color domain to match your data domain if you want to bind data or color
        .colorDomain([-500, 500])
       //##### Accessors

        //Accessor functions are applied to each value returned by the grouping

        // `.colorAccessor` - the returned value will be passed to the `.colors()` scale to determine a fill color
        .colorAccessor(function (d) {
            return d.value.difference;
        })
        // `.keyAccessor` - the `X` value will be passed to the `.x()` scale to determine pixel location
        .keyAccessor(function (p) {
            return p.value.difference;
        })
        // `.valueAccessor` - the `Y` value will be passed to the `.y()` scale to determine pixel location
        .valueAccessor(function (p) {
            return p.value.actual_cost;
        })
        // `.radiusValueAccessor` - the value will be passed to the `.r()` scale to determine radius size;
        //   by default this maps linearly to [0,100]
        .radiusValueAccessor(function (p) {
            return p.value.count; //amount of records
        })
        .maxBubbleRelativeSize(0.3)
        .x(d3.scale.linear().domain([-3000, 3000]))
        .y(d3.scale.linear().domain([0, 100]))
        .r(d3.scale.linear().domain([0, 4000]))
        //##### Elastic Scaling

        //`.elasticY` and `.elasticX` determine whether the chart should rescale each axis to fit the data.
        .elasticY(true)
        .elasticX(true)
        //`.yAxisPadding` and `.xAxisPadding` add padding to data above and below their max values in the same unit
        //domains as the Accessors.
        .yAxisPadding(20000000)
        .xAxisPadding(500000)
        // (_optional_) render horizontal grid lines, `default=false`
        .renderHorizontalGridLines(true)
        // (_optional_) render vertical grid lines, `default=false`
        .renderVerticalGridLines(true)
        // (_optional_) render an axis label below the x axis
        .xAxisLabel('Difference between Estimation and Actual Cost')
        // (_optional_) render a vertical axis lable left of the y axis
        .yAxisLabel('Actual Cost')

        //Labels are displayed on the chart for each bubble. Titles displayed on mouseover.
        // (_optional_) whether chart should render labels, `default = true`
        .renderLabel(true)
        .label(function (p) {
            return p.key || "unknown (data missing)";
        })
        // (_optional_) whether chart should render titles, `default = false`
        .renderTitle(true)
        .title(function (p) {
            return [
                p.key,
                'Records:'+ p.value.count,
                'Actual Cost: $' + commaFormat(Math.round(p.value.actual_cost)),
                'Estmate Cost: $' + commaFormat(Math.round(p.value.original_estimate)),
                'Difference: $' + commaFormat(Math.round(p.value.difference))
            ].join('\n');
        })
        //#### Customize Axes

        // Set a custom tick format. Both `.yAxis()` and `.xAxis()` return an axis object,
        // so any additional method chaining applies to the axis, not the chart.
         yearlyBubbleChart.yAxis().tickFormat(function (v) {
            return v/1000000 + 'MM $';
        });
         yearlyBubbleChart.xAxis().tickFormat(function (v) {
            return v/1000 + 'k $';
        });


    overOrUnderChart /* dc.pieChart('#gain-loss-chart', 'chartGroup') */
    // (_optional_) define chart width, `default = 200`
        .width(240)
    // (optional) define chart height, `default = 200`
        .height(240)
    // Define pie radius
        .radius(80)
    // Set dimension
        .dimension(overOrUnder)
    // Set group
        .group(overOrUnderGroup)
    // (_optional_) by default pie chart will use `group.key` as its label but you can overwrite it with a closure.
        .label(function (d) {
            if (overOrUnderChart.hasFilter() && !overOrUnderChart.hasFilter(d.key)) {
                return d.key + '(0%)';
            }
            var label = d.key;
            if (all.value()) {
                label += '(' + Math.floor(d.value / all.value() * 100) + '%)';
            }
            return label;
        });

    quarterChart /* dc.pieChart('#quarter-chart', 'chartGroup') */
        .width(220)
        .height(220)
        .radius(80)
        .innerRadius(30)
        .dimension(quarter)
        .group(quarterGroup)
        .title(function (p) {
            return p.key+': $'+commaFormat(p.value);
        });


    projectNumberChart
        .width(440)
        .height(220)
        .margins({top: 20, left: 10, right: 10, bottom: 20})
        .group(projectNumberGroup)
        .dimension(projectNumber)
        // Assign colors to each value in the x scale domain
        .ordinalColors(['#3182bd', '#6baed6'])
        .label(function (d) {
            return d.key;
        })
        // Title sets the row text
        .title(function (d) {
            return d.key;
        })
        .elasticX(true)
        .xAxis().ticks(4);

    equipmentTypeSelect
        .group(equipmentTypeGroup)
        .dimension(equipmentType)
        .multiple(true)
        .numberVisible(10)
        .controlsUseVisibility(true);

    motorHP1Select
        .group(motorHP1Group)
        .dimension(motorHP1)
        .multiple(true)
        .numberVisible(10)
        .controlsUseVisibility(true);

    vendorSelect
        .group(vendorGroup)
        .dimension(vendor)
        .multiple(true)
        .numberVisible(10)
        .controlsUseVisibility(true);

    materialSelect
        .group(materialGroup)
        .dimension(material)
        .multiple(true)
        .numberVisible(10)
        .controlsUseVisibility(true);

    processSelect
        .group(processGroup)
        .dimension(processDimension)
        .multiple(true)
        .numberVisible(10)
        .controlsUseVisibility(true);

    tagSelect
        .group(tagGroup)
        .dimension(tagDimension)
        .multiple(true)
        .numberVisible(10)
        .controlsUseVisibility(true);


    cumulativeCostMoveChart
        .renderArea(true)
        .width(1000)
        .height(200)
        .transitionDuration(1000)
        .margins({top: 50, right: 50, bottom: 25, left: 75})
        .dimension(moveMonths)
        .mouseZoomable(true)
    // Specify a "range chart" to link its brush extent with the zoom of the current "focus chart".
        .rangeChart(cumulativeCostVolumeChart)
        .x(d3.time.scale().domain([new Date(2011, 0, 1), new Date(2017, 12, 30)]))
        .round(d3.time.month.round)
        .xUnits(d3.time.months)
        .elasticY(true)
        .renderHorizontalGridLines(true)
    //##### Legend

        // Position the legend relative to the chart origin and specify items' height and separation.
        .legend(dc.legend().x(800).y(10).itemHeight(13).gap(5))
        .brushOn(false)
        // Add the base layer of the stack with group. The second parameter specifies a series name for use in the
        // legend.
        // The `.valueAccessor` will be used for the base layer
        .group(indexAvgByMonthGroup, 'Monthly Cost Average')
        .valueAccessor(function (d) {
            return (d.value.days > 0) ? (d.value.total / d.value.days) : 0;
        })
        // // Stack additional layers with `.stack`. The first paramenter is a new group.
        // // The second parameter is the series name. The third is a value accessor.
        .stack(monthlySumMoveGroup, 'Monthly Cost Sum', function (d) {
             return d.value;
        })
        // Title can be called by any stack layer.
        .title(function (d) {
            var avg = d.value.avg ? commaFormat(Math.round(d.value.avg))  : null;
            var sum = d.value.total ? commaFormat(Math.round(d.value.total)) :  commaFormat(Math.round(d.value));
            var display ="$"+(avg || sum);
            return [
                timeFormat(d.key),
                display
            ].join('\n');
        });
   
    cumulativeCostMoveChart.yAxis().tickFormat(function (v) {
            return v/1000000 + 'MM $';
        });
    cumulativeCostVolumeChart
        .width(1000)
        .height(40)
        .margins({top: 0, right: 50, bottom: 20, left: 40})
        .dimension(moveMonths)
        .group(volumeByMonthGroup)
        .centerBar(true)
        .gap(1)
        .x(d3.time.scale().domain([new Date(2011, 0, 1), new Date(2017, 12, 30)]))
        .round(d3.time.month.round)
        .alwaysUseRounding(true)
        .xUnits(d3.time.months);
    
    cumulativeCostVolumeChart.yAxis().ticks(0);
 

   /* dashboard with four main charts */
    function remove_empty_bins(source_group) {
        return {
            all:function () {
                return source_group.all().filter(function(d) {
                    return d.value != 0;
                 });
                }
           };
    };
    function remove_empty_bins_avg(source_group) {
        return {
            all:function () {
                return source_group.all().filter(function(d) {
                    return d.value.count != 0;
                 });
                }
           };
    };

   pricebyTagChart 
          .width(440)
          .height(300)
          .dimension(tagDimension)
          .margins({top: 25, right: 50, bottom: 25, left: 100})
          .group(remove_empty_bins(pricebyTagGroup))
          .x(d3.scale.ordinal())
          .xUnits(dc.units.ordinal)
          .xAxisPadding(1).xAxisPaddingUnit(dc.units.ordinal)
          .elasticX(true)
          .elasticY(true)          
          .title(function (p) {
            return p.key+': $' +commaFormat(p.value);
        });

   pricebyTagChart.xAxis().tickFormat(function(v) { return ""; });
   pricebyTagChart.yAxis().tickFormat(function(v) { return v/1000000+"MM $"; });
   pricebyTagChart.rescale();


    sumProcessChart
          .width(440)
          .height(300)
          .dimension(processDimension)
          .margins({top: 25, right: 50, bottom: 25, left: 100})
          .group(remove_empty_bins(processSumGroup))
          .x(d3.scale.ordinal())
          .xUnits(dc.units.ordinal)
          .xAxisPadding(1).xAxisPaddingUnit(dc.units.ordinal)
          .elasticX(true)
          .elasticY(true)
          .title(function (p) {
            return p.key+': $'+  commaFormat(p.value);
        });
    
   sumProcessChart.xAxis().tickFormat(function(v) { return ""; });
   sumProcessChart.yAxis().tickFormat(function(v) { return v/1000000+"MM $"; });
   sumProcessChart.rescale();

   avgPricebyEquipmentTypeChart
      .width(440)
      .height(300)
      .dimension(equipmentType)
      .margins({top: 25, right: 50, bottom: 25, left: 100})
      .group(remove_empty_bins_avg(avgPricebyEquipmentTypeGroup))
      .x(d3.scale.ordinal())
      .xUnits(dc.units.ordinal)
      .xAxisPadding(1).xAxisPaddingUnit(dc.units.ordinal)
      .valueAccessor(function(d) { 
            return (d.value.count > 0) ? (d.value.total / d.value.count) : d.value.total;})
      .elasticX(true)
      .elasticY(true)
      .title(function (p) {
            return p.key+': $'+commaFormat((p.value.count > 0) ? Math.round(p.value.total / p.value.count) : p.value.total);
        });

  avgPricebyEquipmentTypeChart.xAxis().tickFormat(function(v) { return ""; });
  avgPricebyEquipmentTypeChart.yAxis().tickFormat(function(v) { return v/1000+"k $"; });
  avgPricebyEquipmentTypeChart.rescale();

   avgVendorChart
      .width(440)
      .height(300)
      .dimension(vendor)
      .margins({top: 25, right: 50, bottom: 25, left: 100})
      .group(remove_empty_bins_avg(avgVendorGroup))
      .x(d3.scale.ordinal())
      .xUnits(dc.units.ordinal)
      .xAxisPadding(1).xAxisPaddingUnit(dc.units.ordinal)
      .valueAccessor(function(d) { 
            return (d.value.count > 0) ? (d.value.total / d.value.count) : d.value.total;})
      .elasticX(true)
      .elasticY(true)
      .title(function (p) {
            return p.key+': $'+commaFormat((p.value.count > 0) ? Math.round(p.value.total / p.value.count) : p.value.total);
        })

   avgVendorChart.xAxis().tickFormat(function(v) { return ""; });
   avgVendorChart.yAxis().tickFormat(function(v) { return v/1000+"k $"; });
   avgVendorChart.rescale();

    dc.renderAll();
});


