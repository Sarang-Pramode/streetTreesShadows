mapboxgl.accessToken =
  "pk.eyJ1IjoiamdmOTQiLCJhIjoiY2thaXk2bjQzMDZvYzJ3cXoxeThnODU5NyJ9.o1ijddB0igPdlsWMw6iRVw";
const { MapboxLayer, PointCloudLayer } = deck;

var map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/jgf94/ckg7ai9oo06zj19p6zw741oe2",
  center: [-73.9867, 40.6845],
  zoom: 10,
  pitch: 15,
  bearing: 0,
  antialias: true,
});

/////////////

var lat;
var lon;
var species = "Common Name";
var date;
var buildings;
var hulls = [];

var sinAz;
var cosAz;
var tanAz;
var sinAmp;
var cosAmp;
var tanAmp;

var shadedPoints = {};
var shadingPoints = {};
var otherPoints = {};

var building;
var selectedBins = [];
var selectedBuildings = [];
var selectedTreeIds = [];
var buildingFilter = ["in", "bin"];

var treeColor = "color";
var shadowColor = "color";

// Initialize a variable to count the number of loaded trees
var loadedTreesCount = 0;
var maxTreesThreshold = 50; // Set the threshold to 50 trees

var boroughBoundaries;
fetch("./data/building_foot_prints/borough_boundaries.geojson")
  .then((response) => response.json())
  .then((data) => {
    boroughBoundaries = data;
  });

// Function to show the modal message
function showModalMessage() {
  var modal = document.getElementById("myModal");
  modal.style.display = "block";

  // Close the modal when the user clicks on the close button (x)
  var closeBtn = document.getElementsByClassName("close")[0];
  closeBtn.onclick = function () {
    modal.style.display = "none";
  };

  // Close the modal when the user clicks anywhere outside the modal
  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
}

const loadBuildingData = (borough) => {

  // load building data
  fetch(
    `./data/building_foot_prints/packed_TF_${borough}_buildings_footprint.geojson`
  )
    .then((response) => response.json())
    .then((data) => (buildings = data));

  // load mapRecource and map layer
  map.addSource("buildings", {
    type: "geojson",
    data: `./data/building_foot_prints/packed_TF_${borough}_buildings_footprint.geojson`,
  });

  map.addLayer({
    id: "buildingExtruded",
    source: "buildings",
    filter: ["in", "bin", ""],
    layout: { visibility: "visible" },
    type: "fill-extrusion",
    minzoom: 15,
    paint: {
      "fill-extrusion-color": "rgb(225,220,215)",
      "fill-extrusion-height": ["/", ["get", "heightroof"], 3.28],
      "fill-extrusion-opacity": 0.5,
    },
  });
  map.addLayer({
    id: "buildingfootprints",
    source: "buildings",
    layout: { visibility: "visible" },
    type: "fill",
    minzoom: 15,
    paint: {
      "fill-color": "#808080",
      "fill-opacity": 0.1,
    },
  });
};

const freeBuildingData = () => {
  buildings = {};

  map.removeLayer("buildingExtruded");
  map.removeLayer("buildingfootprints");
  map.removeSource("buildings");
  console.log("free building data success !!!");

  // remove all buildings and building shadows
  for (var building of selectedBuildings) {
    var buildingBin = building.properties.bin;
    var buildingSourceName = `building${buildingBin}ShadowSourceEast`;
    var buildingLayerName = `building${buildingBin}ShadowLayerEast`;

    if (map.getLayer(buildingLayerName)) {
      map.removeLayer(buildingLayerName);
    }

    if (map.getSource(buildingSourceName)) {
      map.removeSource(buildingSourceName);
    }
  }
  selectedBuildings = [];
  selectedBins = [];
};

const boroughMapToTree = {
  "SI": "staten",
  "MN": "manhattan",
  "BK": "brooklyn",
  "QN": "queens",
  "BX": "bronx"
};

function loadTreeData(boroughCode) {
  const treeBoroughName = boroughMapToTree[boroughCode];
  if (treeBoroughName) {
    map.addSource("treesData", {
      type: "geojson",
      data: `./data/treeGeoJson/${treeBoroughName}.geojson`,
    });

    // Add a layer for each borough
    map.addLayer({
      id: "TreesCircle",
      type: "circle",
      minzoom: 15,
      source: "treesData",
      layout: { visibility: "visible" },
      paint: {
        // make circles larger as the user zooms from z12 to z22
        "circle-radius": {
          base: 1,
          stops: [
            [15, 1.5],
            [17, 3],
            [22, 24],
          ],
        },
        "circle-pitch-alignment": "map",
        "circle-color": "rgba(255,255,255,0)",
        "circle-stroke-color": 'rgba(50,200,75,1)',
        // "circle-stroke-color": [
        //   "interpolate",
        //   ["linear"],
        //   ["get", "zrange"],
        //   0,
        //   "rgba(200,100,50,0.8)",
        //   65,
        //   "rgba(50,200,75,1)",
        // ],
        "circle-stroke-width": {
          base: 1,
          stops: [
            [15, 0.7],
            [17, 1],
            [22, 5],
          ],
        },
        "circle-opacity": 1,
      },
    });


    console.log(`Loaded tree data for ${treeBoroughName}`);
  } else {
    console.error(`Tree data not found for borough code: ${boroughCode}`);
  }
}

function freeTreeData() {
  // If the layer exists, remove event listeners specific to it
  // if (map.getLayer("TreesCircle")) {
  //   map.off("click", "TreesCircle");
  //   map.off("mouseenter", "TreesCircle");
  //   map.off("mouseleave", "TreesCircle");
  // }

  // If the layer exists, remove it
  if (map.getLayer("TreesCircle")) {
    map.removeLayer("TreesCircle");
  }

  // If the source exists, remove it
  if (map.getSource("treesData")) {
    map.removeSource("treesData");
  }

  console.log("freeTreeData has been executed");
}

// const boroughs = ['bronx', 'brooklyn', 'manhattan', 'queens', 'staten'];
const boroughs = [
  { name: 'bronx', color: 'rgba(200,100,50,0.8)' },
  { name: 'brooklyn', color: 'rgba(50,200,75,1)' },
  { name: 'manhattan', color: 'rgba(100,50,200,0.8)' },
  { name: 'queens', color: 'rgba(50,100,200,1)' },
  { name: 'staten', color: 'rgba(200,50,100,0.8)' },
];

map.on("load", function () {

  // Get the modal
	var modal = document.getElementById("IntroModal");
	// Get the <span> element that closes the modal
	var span = document.getElementById("close");
	// When the user clicks on <span> (x), close the modal
	span.onclick = function() {
	  modal.style.display = "none";
	};
	// When the user clicks anywhere outside of the modal, close it
	window.onclick = function(event) {
	  if (event.target == modal) {
	    modal.style.display = "none";
	  }
	};

	modal.style.display = "block";

  
  updateDayHourBar();
  stretchHoursBar();
  map.removeLayer("building");

  map.addSource("trees", {
    type: "geojson",
    data: "./data/tile987187.geojson",
  });

  map.addSource("treespoly", {
    type: "geojson",
    data: "./data/tile987187polygon.geojson",
  });

  // map.addSource("buildings", {
  //   type: "geojson",
  //   data: "./data/tile987187buildings.geojson",
  // });


  // map.addLayer({
  //   id: "buildingExtruded",
  //   source: "buildings",
  //   filter: ["in", "bin", ""],
  //   layout: { visibility: "visible" },
  //   type: "fill-extrusion",
  //   minzoom: 15,
  //   paint: {
  //     "fill-extrusion-color": "rgb(225,220,215)",
  //     "fill-extrusion-height": ["/", ["get", "heightroof"], 3.28],
  //     "fill-extrusion-opacity": 0.5,
  //   },
  // });

  // map.addLayer({
  //   id: "buildingfootprints",
  //   source: "buildings",
  //   layout: { visibility: "visible" },
  //   type: "fill",
  //   minzoom: 15,
  //   paint: {
  //     "fill-color": "#808080",
  //     "fill-opacity": 0.1,
  //   },
  // });

  // map.addLayer({
  //   id: "trees1",
  //   type: "circle",
  //   minzoom: 15,
  //   source: "trees",
  //   layout: { visibility: "visible" },
  //   paint: {
  //     // make circles larger as the user zooms from z12 to z22
  //     "circle-radius": {
  //       base: 1,
  //       stops: [
  //         [15, 1.5],
  //         [17, 3],
  //         [22, 24],
  //       ],
  //     },
  //     "circle-pitch-alignment": "map",
  //     "circle-color": "rgba(255,255,255,0)",
  //     "circle-stroke-color": [
  //       "interpolate",
  //       ["linear"],
  //       ["get", "zrange"],
  //       0,
  //       "rgba(200,100,50,0.8)",
  //       65,
  //       "rgba(50,200,75,1)",
  //     ],
  //     "circle-stroke-width": {
  //       base: 1,
  //       stops: [
  //         [15, 0.7],
  //         [17, 1],
  //         [22, 5],
  //       ],
  //     },
  //     "circle-opacity": 1,
  //   },
  // });

  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
  });

  // Set the target zoom levels
  const targetZoomLevelIn = 15.1;
  const targetZoomLevelOut = 15;

  // Flags to track if the target zoom levels have been reached
  let targetZoomInReached = false;
  let targetZoomOutReached = true;

  // Function to execute when the target zoom level for zooming in is reached
  function onTargetZoomInReached() {
    const center = map.getCenter();
    const centerPoint = turf.point([center.lng, center.lat]);
    let currentBorough;

    boroughBoundaries.features.some((feature) => {
      const coordinates = feature.geometry.coordinates;

      if (feature.geometry.type === "Polygon") {
        const boroughPolygon = turf.polygon(coordinates);
        if (turf.booleanPointInPolygon(centerPoint, boroughPolygon)) {
          currentBorough = feature.properties.boro_name;
          return true;
        }
      } else if (feature.geometry.type === "MultiPolygon") {
        return coordinates.some((polygonCoords) => {
          const boroughPolygon = turf.polygon(polygonCoords);
          if (turf.booleanPointInPolygon(centerPoint, boroughPolygon)) {
            currentBorough = feature.properties.boro_name;
            return true;
          }
          return false;
        });
      }
      return false;
    });
    const boroughMap = {
      "Staten Island": "SI",
      Manhattan: "MN",
      Brooklyn: "BK",
      Queens: "QN",
      Bronx: "BX",
    };
    if (currentBorough) {
      console.log(
        `Target zoom level in (${targetZoomLevelIn}) reached.`,
        "Borough:",
        currentBorough
      );
      loadBuildingData(boroughMap[currentBorough]);
      loadTreeData(boroughMap[currentBorough]);
    } else {
      console.log(
        `Target zoom level in (${targetZoomLevelIn}) reached. Current viewing location:`,
        center,
        "Borough: Outside NYC boroughs"
      );
    }
  }

  // Function to execute when the target zoom level for zooming out is reached
  function onTargetZoomOutReached() {
    console.log(`Target zoom level out (${targetZoomLevelOut}) reached.`);
    freeBuildingData();
    freeTreeData();
  }

  // Add a 'zoomend' event listener
  map.on("zoomend", () => {
    const currentZoomLevel = map.getZoom();

    // Check for zooming in
    if (currentZoomLevel >= targetZoomLevelIn && !targetZoomInReached) {
      onTargetZoomInReached();
      targetZoomInReached = true;
    } else if (currentZoomLevel < targetZoomLevelIn) {
      targetZoomInReached = false;
    }

    // Check for zooming out
    if (currentZoomLevel <= targetZoomLevelOut && !targetZoomOutReached) {
      onTargetZoomOutReached();
      targetZoomOutReached = true;
    } else if (currentZoomLevel > targetZoomLevelOut) {
      targetZoomOutReached = false;
    }
  });

  // map.on("mouseenter", "trees1", (e) => {
  //   // Change the cursor style as a UI indicator.
  //   map.getCanvas().style.cursor = "pointer";

  //   // Copy coordinates array.
  //   const coordinates = e.features[0].geometry.coordinates.slice();
  //   const tree_id = e.features[0].properties.tree_id;
  //   const spc_common = e.features[0].properties.spc_common;
  //   const spc_latin = e.features[0].properties.spc_latin;
  //   const address = e.features[0].properties.address;
  //   const status = e.features[0].properties.status;
  //   const health = e.features[0].properties.health;
  //   const truckDiameter = e.features[0].properties.tree_dbh;
  //   const canopyRadius = e.features[0].properties.canopy_radius_calc_ft;
  //   const height = e.features[0].properties.zrange;
  //   const density = e.features[0].properties.density;

  //   if (shadedPoints[tree_id] == undefined) {
  //     shadedPoints[tree_id] = [];
  //   }
  //   if (shadingPoints[tree_id] == undefined) {
  //     shadingPoints[tree_id] = [];
  //   }
  //   if (otherPoints[tree_id] == undefined) {
  //     otherPoints[tree_id] = [];
  //   }
  //   const totalPoint =
  //     shadedPoints[tree_id].length +
  //     shadingPoints[tree_id].length +
  //     otherPoints[tree_id].length;
  //   let shadedPointPercentage =
  //     (shadedPoints[tree_id].length / totalPoint) * 100;
  //   shadedPointPercentage = shadedPointPercentage.toFixed(2) + "%";
  //   let shadingPointPercentage =
  //     (shadingPoints[tree_id].length / totalPoint) * 100;
  //   shadingPointPercentage = shadingPointPercentage.toFixed(2) + "%";
  //   let otherPointPercentage = (otherPoints[tree_id].length / totalPoint) * 100;
  //   otherPointPercentage = otherPointPercentage.toFixed(2) + "%";

  //   // Ensure that if the map is zoomed out such that multiple
  //   // copies of the feature are visible, the popup appears
  //   // over the copy being pointed to.
  //   while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
  //     coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
  //   }

  //   // Populate the popup and set its coordinates
  //   // based on the feature found.
  //   let description = `
  //   <div class="popup-species">
  //       <h3 class="spc_common">${spc_common}</h3>
  //       <h5 class="spc_latin">${spc_latin}</h5>
  //     </div>
  //     <div class="popup-details">
  //       <p><strong>Address:</strong> ${address}</p>
  //       <p><strong>Status:</strong> ${status}</p>
  //       <p><strong>Health:</strong> ${health}</p>
  //       <p><strong>Truck Diameter:</strong> ${truckDiameter}</p>
  //       <p><strong>Canopy Radius:</strong> ${canopyRadius}</p>
  //       <p><strong>Height:</strong> ${height}</p>
  //       <p><strong>Density:</strong> ${density}</p>
  //       <p><strong>Shaded Percent:</strong> <span class="shaded-percent">${shadedPointPercentage}</span></p>
  //       <p><strong>Shading Percent:</strong> <span class="shading-percent">${shadingPointPercentage}</span></p>
  //       <p><strong>Other Percent:</strong> <span class="other-percent">${otherPointPercentage}</span></p>
  //     </div>
  //   `;
  //   document.getElementById("board").style.display = "none";
  //   popup.setLngLat(coordinates).setHTML(description).addTo(map);
  // });

  // map.on("mouseleave", "trees1", () => {
  //   map.getCanvas().style.cursor = "";
  //   popup.remove();
  //   document.getElementById("board").style.display = "block";
  // });

  //

  // map.on("mouseenter", "trees1", function (e) {
  //   map.getCanvas().style.cursor = "pointer";
  // });
  // map.on("mouseleave", "trees1", function () {
  //   map.getCanvas().style.cursor = "";
  // });

  map.on("click", "TreesCircle", function (e) {

    // Check if the maximum threshold has been reached
    if (loadedTreesCount >= maxTreesThreshold) {
      console.log("Maximum tree threshold reached. Cannot load more trees.");
      showModalMessage();
      return;
    }

    loadedTreesCount++;

    console.log("Tree Count");
    console.log(loadedTreesCount);
    
    var treeID = e.features[0].properties["tree_id"];

    lat = e.features[0].properties["Latitude"];
    lon = e.features[0].properties["longitude"];

    var pointCloudId = `tree${treeID}`;
    var pointCloudFile = `https://s3.amazonaws.com/www.treefolio.org-2.0/data/treeJsonFiles/2021/${treeID}.json`;

    console.log(`pCloudFilelink:${pointCloudFile}`)
    if (map.getLayer(pointCloudId)) {
      return;
    }

    map.addLayer(
      new MapboxLayer({
        id: pointCloudId,
        type: PointCloudLayer,
        data: pointCloudFile,
        getPosition: (d) => [d[1], d[0], d[2]],
        getColor: (d) => (d) =>
          pointColor(
            [d[1], d[0], d[2]],
            hulls,
            tanAmp,
            sinAmp,
            cosAz,
            treeColor,
            treeID
          ),
        sizeUnits: "feet",
        pointSize: 3,
        opacity: 0.8,
        visible: true,
      })
    );

    // let day = parseFloat(document.getElementById("dayslider").value);
    // let hour = parseFloat(document.getElementById("hourslider").value);
    // console.log(`day:${day}, hour:${hour}`);

    // date = new Date("2022-01-01 00:00");
    // console.log(`date:${date}`);
    // date.setDate(date.getDate() + day);
    // console.log(`day + date:${date}`);
    // var offset = date.getTimezoneOffset();
    // console.log(`offset:${offset}`);
    // date.setTime(date.getTime() + hour * 60 * 60 * 1000 + offset * 60 * 1000);
    // console.log(`date + hour:${date}`);
    let day = parseFloat(document.getElementById("dayslider").value);
    let hour = parseFloat(document.getElementById("hourslider").value);

    let wholeHour = Math.floor(hour);
    let fractionalHour = hour - wholeHour;
    let minute = Math.round(fractionalHour * 60);

    date = new Date("2022-01-01 00:00");
    date.setDate(date.getDate() + day);
    var offset = date.getTimezoneOffset();
    date.setTime(date.getTime() + wholeHour * 60 * 60 * 1000 + minute * 60 * 1000 + offset * 60 * 1000);

    // updateUI(e);
    selectedTreeIds.push(treeID);
    shadow(date, (e) => {
      // console.log("shadow: plant new tree");
    });
    stretchHoursBar();
  });

  map.on("mouseenter", "TreesCircle", (e) => {
    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = "pointer";

    // Copy coordinates array.
    const coordinates = e.features[0].geometry.coordinates.slice();
    const tree_id = e.features[0].properties.tree_id;
    const spc_common = e.features[0].properties.spc_common;
    const spc_latin = e.features[0].properties.spc_latin;
    const address = e.features[0].properties.address;
    const status = e.features[0].properties.status;
    const health = e.features[0].properties.health;
    const truckDiameter = e.features[0].properties.tree_dbh;
    const canopyRadius = e.features[0].properties.canopy_radius_calc_ft;
    const height = e.features[0].properties.zrange;
    const density = e.features[0].properties.density;

    if (shadedPoints[tree_id] == undefined) {
      shadedPoints[tree_id] = [];
    }
    if (shadingPoints[tree_id] == undefined) {
      shadingPoints[tree_id] = [];
    }
    if (otherPoints[tree_id] == undefined) {
      otherPoints[tree_id] = [];
    }
    const totalPoint =
      shadedPoints[tree_id].length +
      shadingPoints[tree_id].length +
      otherPoints[tree_id].length;

    let shadedPointPercentage, shadingPointPercentage, otherPointPercentage;

    if (totalPoint == 0) {
      shadedPointPercentage = "---%";
      shadingPointPercentage = "---%";
      otherPointPercentage = "---%";
    } else {
      shadedPointPercentage = (shadedPoints[tree_id].length / totalPoint) * 100;
      shadedPointPercentage = shadedPointPercentage.toFixed(2) + "%";
      shadingPointPercentage = (shadingPoints[tree_id].length / totalPoint) * 100;
      shadingPointPercentage = shadingPointPercentage.toFixed(2) + "%";
      otherPointPercentage = (otherPoints[tree_id].length / totalPoint) * 100;
      otherPointPercentage = otherPointPercentage.toFixed(2) + "%";
    }


    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    // Populate the popup and set its coordinates
    // based on the feature found.
    let description = `
    <div class="popup-species">
        <h3 class="spc_common">${spc_common}</h3>
        <h5 class="spc_latin">${spc_latin}</h5>
      </div>
      <div class="popup-details">
        <p><strong>Address:</strong> ${address}</p>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Health:</strong> ${health}</p>
        <p><strong>Trunk Diameter:</strong> ${truckDiameter}</p>
        <p><strong>Canopy Radius:</strong> ${canopyRadius}</p>
        <p><strong>Height:</strong> ${height}</p>
        <p><strong>Density:</strong> ${density}</p>
        <p><strong>Canopy Shading Ground:</strong> <span class="other-percent">${otherPointPercentage}</span></p>
        <p><strong>Canopy Shading Buildings:</strong> <span class="shading-percent">${shadingPointPercentage}</span></p>
        <p><strong>Canopy In Shade:</strong> <span class="shaded-percent">${shadedPointPercentage}</span></p>
      </div>
    `;
    document.getElementById("board").style.display = "none";
    popup.setLngLat(coordinates).setHTML(description).addTo(map);
  });

  map.on("mouseleave", "TreesCircle", () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
    document.getElementById("board").style.display = "block";
  });

  //

  map.on("mouseenter", "TreesCircle", function (e) {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "TreesCircle", function () {
    map.getCanvas().style.cursor = "";
  });

  map.on("mouseenter", "buildingfootprints", function (e) {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "buildingfootprints", function () {
    map.getCanvas().style.cursor = "";
  });

  //welcome page
  const mapBackgroundOverlay = document.getElementById('mapBackgroundOverlay');

  // Grab the overlay and close button by their respective IDs
  const welcomeOverlay = document.getElementById('welcomeOverlay');
  const closeWelcomeOverlay = document.getElementById('closeWelcomeOverlay');

  // Add an event listener to the close button to hide the welcome overlay when clicked
  closeWelcomeOverlay.addEventListener('click', function() {
      welcomeOverlay.style.display = 'none';
      mapBackgroundOverlay.style.display = 'none';
  });

  map.on("click", "trees1", function (e) {
    
    var treeID = e.features[0].properties["tree_id"];

    lat = e.features[0].properties["Latitude"];
    lon = e.features[0].properties["longitude"];

    var pointCloudId = `tree${treeID}`;
    var pointCloudFile = `data/pointCloudJSONs_ver2021/${treeID}.json`;
    if (map.getLayer(pointCloudId)) {
      return;
    }
    map.addLayer(
      new MapboxLayer({
        id: pointCloudId,
        type: PointCloudLayer,
        data: pointCloudFile,
        getPosition: (d) => [d[1], d[0], d[2]],
        getColor: (d) =>
          pointColor(
            [d[1], d[0], d[2]],
            hulls,
            tanAmp,
            sinAmp,
            cosAz,
            treeColor,
            treeID
          ),
        sizeUnits: "feet",
        pointSize: 3,
        opacity: 0.8,
        visible: true,
      })
    );

    let day = parseFloat(document.getElementById("dayslider").value);
    let hour = parseFloat(document.getElementById("hourslider").value);

    let wholeHour = Math.floor(hour);
    let fractionalHour = hour - wholeHour;
    let minute = Math.round(fractionalHour * 60);

    date = new Date("2022-01-01 00:00");
    date.setDate(date.getDate() + day);
    var offset = date.getTimezoneOffset();
    date.setTime(date.getTime() + wholeHour * 60 * 60 * 1000 + minute * 60 * 1000 + offset * 60 * 1000);

    // updateUI(e);
    selectedTreeIds.push(treeID);
    shadow(date, (e) => {
      // console.log("shadow: plant new tree");
    });
    stretchHoursBar();
  });

  function updateUI(e) {
    species = e.features[0].properties["spc_common"];
    document.getElementById("common").innerHTML = species
      .concat("<br> @ ")
      .concat(date.toString().split("(").slice(0, 1));
    var link = "https://www.designacrossscales.org/public_test/html/".concat(
      species,
      ".html"
    );
    document.getElementById("common").setAttribute("href", link);
    document.getElementById("latin").innerHTML =
      e.features[0].properties["spc_latin"];
    document.getElementById("address").innerHTML =
      e.features[0].properties["address"];
    document.getElementById("status").innerHTML =
      e.features[0].properties["status"];
    document.getElementById("health").innerHTML =
      e.features[0].properties["health"];
    document.getElementById("trunk").innerHTML =
      e.features[0].properties["tree_dbh"];
    document.getElementById("canopy").innerHTML =
      e.features[0].properties["canopy_radius_calc_ft"];
    document.getElementById("height").innerHTML =
      e.features[0].properties["zrange"];
    document.getElementById("density").innerHTML =
      e.features[0].properties["density"];
  }

  function updateDayHourBar() {
    let day = parseFloat(document.getElementById("dayslider").value);
    let hour = parseFloat(document.getElementById("hourslider").value);
    console.log(`day:${day}, hour:${hour}`);

    let wholeHour = Math.floor(hour);
    let fractionalHour = hour - wholeHour;
    let minute = Math.round(fractionalHour * 60);

    date = new Date("2022-01-01 00:00");
    date.setDate(date.getDate() + day);
    var offset = date.getTimezoneOffset();
    date.setTime(date.getTime() + wholeHour * 60 * 60 * 1000 + minute * 60 * 1000 + offset * 60 * 1000);
    let dateString = date.toString().split(" ");
    day = `${dateString[1]} ${dateString[2]}`;
    hour = `${dateString[4].split(":")[0]}:${("0" + dateString[4].split(":")[1]).slice(-2)} EST`;
    document.getElementById("day").innerHTML = day;
    document.getElementById("hour").innerHTML = hour;
  }

  map.on("click", "buildingfootprints", function (e) {
    var bin = e.features[0].properties["bin"];
    selectedBins.push(bin);

    map.setFilter("buildingExtruded", ["in", "bin", ...selectedBins]);

    // function buildingShadowUpdate(buildings) {
    //   for (let i = 0; i < buildings.features.length; i++) {
    //     if (buildings.features[i].properties.bin == bin) {
    //       var building = buildings.features[i];
    //       selectedBuildings.push(building);
    //     } else {
    //     }
    //   }
    // }
    function buildingShadowUpdate(buildings) {
      buildings.features.forEach((building) => {
        if (building.properties.bin === bin) {
          selectedBuildings.push(building);

        }
      });
    }

    buildingShadowUpdate(buildings);
  });

  var monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function getCurrentMonth(dayOfYear) {
    let totalDays = 0;
    for (let i = 0; i < monthDays.length; i++) {
      if (dayOfYear <= (totalDays + monthDays[i])) {
        return i; // Return the 0-indexed month (0 for January, 11 for December).
      }
      totalDays += monthDays[i];
    }
  }

  // time increment buttons
  var dayIncrementButton = document.getElementById("day-increment");
  var hourIncrementButton = document.getElementById("hour-increment");

  dayIncrementButton.addEventListener("click", incrementDay);
  hourIncrementButton.addEventListener("click", incrementHour);

  function incrementDay() {

    var slider = document.getElementById("dayslider");
    var currentMonth = getCurrentMonth(parseInt(slider.value));
    var daysToAdd = monthDays[currentMonth];

    slider.value = Math.min(parseInt(slider.value) + daysToAdd, slider.max);
    // slider.value = Math.min(parseInt(slider.value) + 1, slider.max);// increase the value by 1, ensuring it doesn't exceed its maximum

    updateDayHourBar();
    shadow(date, (e) => {
      // console.log("shadow: stretch days bar");
    });
  }

  function incrementHour() {

    var slider = document.getElementById("hourslider");
    slider.value = Math.min(parseFloat(slider.value) + 1.0, slider.max);// increase the value by 1, ensuring it doesn't exceed its maximum
    updateDayHourBar();
    shadow(date, (e) => {
      // console.log("shadow: stretch days bar");
    });
  }

  // time decrement buttons
  var dayDecrementButton = document.getElementById("day-decrement");
  var hourDecrementButton = document.getElementById("hour-decrement");

  dayDecrementButton.addEventListener("click", decrementDay);
  hourDecrementButton.addEventListener("click", decrementHour);

  function decrementDay() {

    var slider = document.getElementById("dayslider");
    var currentMonth = getCurrentMonth(parseInt(slider.value));
    var daysToSubtract = currentMonth > 0 ? monthDays[currentMonth - 1] : 0;

    slider.value = Math.max(parseInt(slider.value) - daysToSubtract, slider.min);
    // slider.value = Math.max(parseInt(slider.value) - 1, slider.min);// decrease the value by 1, ensuring it doesn't go below its minimum
    updateDayHourBar();
    shadow(date, (e) => {
      // console.log("shadow: stretch days bar");
    });
  }

  function decrementHour() {

    var slider = document.getElementById("hourslider");
    slider.value = Math.max(parseFloat(slider.value) - 1.0, slider.min);// decrease the value by 1, ensuring it doesn't go below its minimum
    updateDayHourBar();
    shadow(date, (e) => {
      // console.log("shadow: stretch days bar");
    });
  }


  document.getElementById("dayslider").addEventListener("input", function (h) {
    updateDayHourBar();
    // date = new Date("2022-03-22 02:01:12");
    shadow(date, (e) => {
      // console.log("shadow: stretch days bar");
    });

    stretchHoursBar();
  });

  document.getElementById("hourslider").addEventListener("input", function (h) {
    updateDayHourBar();

    shadow(date, (e) => {
      // console.log("shadow: stretch hours bar");
    });
  });

});

// shadow update utils
function getBuildingShadow(building) {
  var buildingHeight = building.properties.heightroof;
  var buildingPoints = building.geometry.coordinates[0][0];
  var buildingBin = building.properties.bin;
  var buildingPointsGround = [];
  var buildingSourceName = `building${buildingBin}ShadowSourceEast`;
  var buildingLayerName = `building${buildingBin}ShadowLayerEast`;

  if (map.getLayer(buildingLayerName)) {
    map.removeLayer(buildingLayerName);
  }

  if (map.getSource(buildingSourceName)) {
    map.removeSource(buildingSourceName);
  }
  for (let i = 0; i < buildingPoints.length; i++) {
    buildingPointsGround.push(buildingPoints[i]);
    var x = buildingPoints[i][0];
    var y = buildingPoints[i][1];
    var z = buildingHeight / 3.28;
    var buildingPointGround = [
      x - ((z / tanAmp) * sinAz) / 84540.7,
      y - ((z / tanAmp) * cosAz) / 111047.7,
    ];
    buildingPointsGround.push(buildingPointGround);
  }
  var hullPoints = makeHull(buildingPointsGround);
  hulls.push(hullPoints);
  console.log("BuildingShadow :")
  console.log("buildingPointsGround :")
  console.log(buildingPointsGround)
  console.log("hullPoints :")
  console.log(hullPoints)

  map.addSource(buildingSourceName, {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: {
        type: "Polygon",
        // These coordinates outline Maine.
        coordinates: [hullPoints],
      },
    },
  });

  map.addLayer({
    id: buildingLayerName,
    type: "fill",
    source: buildingSourceName, // reference the data source
    layout: {},
    paint: {
      "fill-color": "#424359", // blue color fill
      "fill-opacity": 0.2,
    },
  });
}

function shadow(date, callback) {
  console.log("getPosition: ");
  console.log(date);
  console.log(lat);
  console.log(lon);
  var sunPosition = SunCalc.getPosition(date, lat, lon);
  var az = (sunPosition["azimuth"] * 180) / Math.PI;
  var amp = (sunPosition["altitude"] * 180) / Math.PI;
  console.log("shadow: start");
  console.log("sunPosition:")
  console.log(sunPosition)
  console.log("az:")
  console.log(az)
  console.log("amp:")
  console.log(amp)
  var az = parseFloat(az);
  var amp = parseFloat(amp);
  console.log("--------")
  console.log("az:")
  console.log(az)
  console.log("amp:")
  console.log(amp)

  sinAz = Math.sin((az * Math.PI) / 180);
  cosAz = Math.cos((az * Math.PI) / 180);
  tanAz = Math.tan((az * Math.PI) / 180);
  sinAmp = Math.sin(((amp - 90) * Math.PI) / 180);
  cosAmp = Math.cos(((amp - 90) * Math.PI) / 180);
  tanAmp = Math.tan((-amp * Math.PI) / 180);
  console.log("sinAz:")
  console.log(sinAz)
  console.log("cosAz:")
  console.log(cosAz)
  console.log("tanAz:")
  console.log(tanAz)
  console.log("sinAmp:")
  console.log(sinAmp)
  console.log("cosAmp:")
  console.log(cosAmp)
  console.log("tanAmp:")
  console.log(tanAmp)

  shadedPoints = {};
  shadingPoints = {};
  otherPoints = {};

  //add in building shadow code
  hulls = [];
  for (var building of selectedBuildings) {
    getBuildingShadow(building);
  }

  //end building shadow code

  //start update tree
  // console.log(`From shadow func current selected trees: ${selectedTreeIds}`);
  for (const tree_id of selectedTreeIds) {
    var pointCloudId = `tree${tree_id}`;
    var pointCloudFile = `https://s3.amazonaws.com/www.treefolio.org-2.0/data/treeJsonFiles/2021/${tree_id}.json`;
    // console.log(pointCloudFile);
    var shadowId = `shadow${tree_id}`;

    if (map.getLayer(pointCloudId)) {
      map.removeLayer(pointCloudId);
    }
    if (map.getLayer(shadowId)) {
      map.removeLayer(shadowId);
    }
    map.addLayer(
      new MapboxLayer({
        id: pointCloudId,
        type: PointCloudLayer,
        data: pointCloudFile,
        getPosition: (d) => [d[1], d[0], d[2]],
        getColor: (d) =>
          pointColor(
            [d[1], d[0], d[2]],
            hulls,
            tanAmp,
            sinAmp,
            cosAz,
            treeColor,
            tree_id
          ),
        sizeUnits: "feet",
        pointSize: 3,
        opacity: 0.8,
        visible: true,
      })
    );

    // //end update tree

    map.addLayer(
      new MapboxLayer({
        id: shadowId,
        type: PointCloudLayer,
        data: pointCloudFile,
        getPosition: (d) => [
          d[1] - ((d[2] / tanAmp) * sinAz) / 84540.7,
          d[0] - ((d[2] / tanAmp) * cosAz) / 111047.7,
          d[2] * 0,
        ], //approx degree to meter conversion from here: http://www.csgnetwork.com/degreelenllavcalc.html
        getColor: (d) =>
          pointColor(
            [d[1], d[0], d[2]],
            hulls,
            tanAmp,
            sinAmp,
            cosAz,
            shadowColor,
            tree_id
          ), // [ d[2] , d[2], d[2], 255*(d[5]-d[4])-d[2] ],
        sizeUnits: "feet",
        pointSize: 4,
        opacity: 0.1,
        visible: true,
      })
    );
  }
  setTimeout(() => {
    htmlCountUpdate();
  }, 500);

  callback();
}

function stretchHoursBar() {
  var day = parseFloat(document.getElementById("dayslider").value);
  var hour = parseFloat(document.getElementById("hourslider").value);

  var date = new Date("2022-01-01 00:00");
  date.setDate(date.getDate() + day);
  date.setTime(date.getTime() + hour * 60 * 60 * 1000);
  var offset = date.getTimezoneOffset();

  var dist = 183 - Math.abs(183 - day);
  var adjusted = (dist * 114) / 183;

  var times = SunCalc.getTimes(date, 40.7, -70.6);
  var min =
    times.sunrise.getHours() +
    times.sunrise.getMinutes() / 60.0 -
    offset / 60 +
    0.5;
  var max =
    times.sunset.getHours() +
    times.sunset.getMinutes() / 60.0 -
    offset / 60 -
    0.5;

  var width = (max - min) * 4;
  var buffer = (100 - width) / 2;
  document.getElementById("hourslider").min = min;
  document.getElementById("hourslider").max = max;
  document.getElementById("hourslider").style.width = width
    .toString()
    .concat("%");
  document.getElementById("hourslider").style.marginLeft = buffer
    .toString()
    .concat("%");
}

// alternative convexHull function from https://www.nayuki.io/page/convex-hull-algorithm
function makeHull(points) {
  let newPoints = points.slice();
  newPoints.sort();
  return makeHullPresorted(newPoints.reverse());
}
function comparator(a, b) {
  if (a.x < b.x) return -1;
  else if (a.x > b.x) return +1;
  else if (a.y < b.y) return -1;
  else if (a.y > b.y) return +1;
  else return 0;
}

function makeHullPresorted(points) {
  if (points.length <= 1) return points.slice();

  // Andrew's monotone chain algorithm. Positive y coordinates correspond to "up"
  // as per the mathematical convention, instead of "down" as per the computer
  // graphics convention. This doesn't affect the correctness of the result.

  let upperHull = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const [px, py] = p;
    while (upperHull.length >= 2) {
      const [qx, qy] = upperHull[upperHull.length - 1];
      const [rx, ry] = upperHull[upperHull.length - 2];
      if ((qx - rx) * (py - ry) >= (qy - ry) * (px - rx)) {
        upperHull.pop();
      } else break;
    }
    upperHull.push(p);
  }
  upperHull.pop();

  let lowerHull = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    const [px, py] = p;
    while (lowerHull.length >= 2) {
      const [qx, qy] = lowerHull[lowerHull.length - 1];
      const [rx, ry] = lowerHull[lowerHull.length - 2];
      if ((qx - rx) * (py - ry) >= (qy - ry) * (px - rx)) {
        lowerHull.pop();
      } else break;
    }
    lowerHull.push(p);
  }
  lowerHull.pop();

  if (
    upperHull.length == 1 &&
    lowerHull.length == 1 &&
    upperHull[0].x == lowerHull[0].x &&
    upperHull[0].y == lowerHull[0].y
  )
    return upperHull;
  else return upperHull.concat(lowerHull);
}

//big thanks to: http://www.bitbanging.space/posts/convex-hull-algorithms-for-a-set-of-points
function polarAngle(a, b, c) {
  let x = (a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]);
  let y = (a[0] - b[0]) * (c[1] - b[1]) - (c[0] - b[0]) * (a[1] - b[1]);
  return Math.atan2(y, x);
}
function convexHull(p_list) {
  if (p_list.length < 3) return p_list;

  let hull = [];
  let tmp;

  // Find leftmost point
  tmp = p_list[0];
  for (const p of p_list) if (p[0] < tmp[0]) tmp = p;

  hull[0] = tmp;

  let endpoint, secondlast;
  let min_angle, new_end;

  endpoint = hull[0];
  secondlast = [endpoint[0], endpoint[1] + 10];

  do {
    min_angle = Math.PI; // Initial value. Any angle must be lower that 2PI
    for (const p of p_list) {
      tmp = polarAngle(secondlast, endpoint, p);

      if (tmp <= min_angle) {
        new_end = p;
        min_angle = tmp;
      }
    }

    if (new_end != hull[0]) {
      hull.push(new_end);
      secondlast = endpoint;
      endpoint = new_end;
    }
  } while (new_end != hull[0]);
  return hull;
}

//https://stackoverflow.com/questions/22521982/check-if-point-is-inside-a-polygon
function inside(point, vs) {
  // ray-casting algorithm based on
  // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

  var x = point[0];
  var y = point[1];

  var inside = false;
  for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    var xi = vs[i][0],
      yi = vs[i][1];
    var xj = vs[j][0],
      yj = vs[j][1];

    var intersect =
      yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

function pointColor(point, vs, tanAmp, sinAmp, cosAz, mode, tree_id) {
  var x = point[0];
  var y = point[1];
  var z = point[2];
  // console.log(`from pointColor func current tree_id: ${tree_id}`);
  var xg = x - ((z / tanAmp) * sinAz) / 84540.7;
  var yg = y - ((z / tanAmp) * cosAz) / 111047.7;

  var isShading = false;
  var isShaded = false;
  for (var hull of vs) {
    var insideSky = false;
    var insideGround = false;
    if (inside([x, y], hull)) {
      insideSky = true;
    }
    if (inside([xg, yg], hull)) {
      insideGround = true;
    }

    if (insideGround && insideSky == false) {
      isShading = true;
    } else if (insideGround && insideSky) {
      isShaded = true;
    }
  }
  let color;

  if (isShaded) {
    if (!shadedPoints.hasOwnProperty(tree_id)) {
      shadedPoints[tree_id] = [];
    }
    shadedPoints[tree_id].push(point);
    color = [25 + z * 5, 50 + z * 8, 100 + z * 7];
  } else if (isShading) {
    if (!shadingPoints.hasOwnProperty(tree_id)) {
      shadingPoints[tree_id] = [];
    }
    shadingPoints[tree_id].push(point);
    color = [255, 50 + z * 10, 75];
  } else {
    if (!otherPoints.hasOwnProperty(tree_id)) {
      otherPoints[tree_id] = [];
    }
    otherPoints[tree_id].push(point);
    color = [75 + z * z * 0.75, 175 + z * 10, 10 + z * 5];
  }
  switch (mode) {
    case "grey":
      color = [169, 169, 169];
      break;
    case "green":
      color = [75 + z * z * 0.75, 175 + z * 10, 10 + z * 5];
      break;
    default:
  }

  return color;
}

function htmlCountUpdate() {

  let totalShaded = 0;
  let totalShading = 0;
  let totalOther = 0;
  for (const tree in shadedPoints) {
    totalShaded += shadedPoints[tree].length;
  }
  for (const tree in shadingPoints) {
    totalShading += shadingPoints[tree].length;
  }
  for (const tree in otherPoints) {
    totalOther += otherPoints[tree].length;
  }


  let totalPoint = totalShaded + totalShading + totalOther;
  let totalShadedPercent = "---%";
  let totalShadingPercent = "---%";
  let totalOtherPercent = "---%";

  // Only perform calculations if totalPoint is not zero
  if (totalPoint !== 0) {
    totalShadedPercent = ((totalShaded / totalPoint) * 100).toFixed(2) + "%";
    totalShadingPercent = ((totalShading / totalPoint) * 100).toFixed(2) + "%";
    totalOtherPercent = ((totalOther / totalPoint) * 100).toFixed(2) + "%";
  }

  document.getElementById("numOfTrees").innerHTML = selectedTreeIds.length.toString();
  document.getElementById("shadedTree").innerHTML = totalShadedPercent;
  document.getElementById("shadingTree").innerHTML = totalShadingPercent;
  document.getElementById("otherTree").innerHTML = totalOtherPercent;
}

function refreshUIContent() {
  // document.getElementById("common").innerHTML = "Common Name";
  // document.getElementById("latin").innerHTML = "Latin Name";
  // document.getElementById("address").innerHTML = "";
  // document.getElementById("status").innerHTML = "";
  // document.getElementById("health").innerHTML = "";
  // document.getElementById("trunk").innerHTML = "";
  // document.getElementById("canopy").innerHTML = "";
  // document.getElementById("height").innerHTML = "";
  // document.getElementById("density").innerHTML = "";
  // species = "Common Name";
  shadedPoints = {};
  shadingPoints = {};
  otherPoints = {};
  htmlCountUpdate();
}

function onRefresh() {
  // Remove all trees and tree shadows
  for (var tree_id of selectedTreeIds) {
    var pointCloudId = `tree${tree_id}`;
    var shadowId = `shadow${tree_id}`;

    if (map.getLayer(pointCloudId)) {
      map.removeLayer(pointCloudId);
    }
    if (map.getLayer(shadowId)) {
      map.removeLayer(shadowId);
    }
  }
  selectedTreeIds = [];
  loadedTreesCount = 0; // refresh count for modal display
  console.log("loadedTreesCount variable cleared");

  // remove all buildings and building shadows
  for (var building of selectedBuildings) {
    var buildingBin = building.properties.bin;
    var buildingSourceName = `building${buildingBin}ShadowSourceEast`;
    var buildingLayerName = `building${buildingBin}ShadowLayerEast`;

    if (map.getLayer(buildingLayerName)) {
      map.removeLayer(buildingLayerName);
    }

    if (map.getSource(buildingSourceName)) {
      map.removeSource(buildingSourceName);
    }
  }
  selectedBuildings = [];
  selectedBins = [];
  map.setFilter("buildingExtruded", ["in", "bin", ...selectedBins]);

  // refresh UI content
  refreshUIContent();
}

function onGreyShadowColor() {
  shadowColor = "grey";
  shadow(date, (e) => {
    console.log("changed shadow color theme");
  });
  greyShadowButton.setAttribute("active", "true");
  colorShadowButton.setAttribute("active", "false");
}

function onColorShadowColor() {
  shadowColor = "color";
  shadow(date, (e) => {
    console.log("changed shadow color theme");
  });
  colorShadowButton.setAttribute("active", "true");
  greyShadowButton.setAttribute("active", "false");
}

// Add a click event listener to the button
const refreshButton = document.getElementById("refress-button");
refreshButton.addEventListener("click", onRefresh);

// toggle tree shadow color between grey and color
const greyShadowButton = document.getElementById("grey-button");
greyShadowButton.addEventListener("click", onGreyShadowColor);

const colorShadowButton = document.getElementById("color-button");
colorShadowButton.addEventListener("click", onColorShadowColor);

function onGreenTree() {
  treeColor = "green";
  shadow(date, (e) => {
    console.log("changed tree color theme");
  });
  greenTreeButton.setAttribute("active", "true");
  colorTreeButton.setAttribute("active", "false");
}

function onColorTree() {
  treeColor = "color";
  shadow(date, (e) => {
    console.log("changed tree color theme");
  });
  colorTreeButton.setAttribute("active", "true");
  greenTreeButton.setAttribute("active", "false");
}

// toggle tree color between grey and color

const greenTreeButton = document.getElementById("tree-green-button");
greenTreeButton.addEventListener("click", onGreenTree);

const colorTreeButton = document.getElementById("tree-color-button");
colorTreeButton.addEventListener("click", onColorTree);

document.querySelector(".burger-menu").addEventListener("click", function () {
  this.classList.toggle("open");
  document.querySelector(".menu-items").classList.toggle("open");
});
