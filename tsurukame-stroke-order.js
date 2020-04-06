let isNode = (typeof window === 'undefined')

if (isNode) {
  const jsdom = require('jsdom');
  const { JSDOM } = jsdom;
  const { window } = new JSDOM(`
  <html>
  <script type="text/javascript" src="file://${require.resolve('snapsvg')}"></script>
  <script>
  document.addEventListener('DOMContentLoaded', function() {
    window.onModulesLoaded();
  });
  </script>
  </html>`,
  {
    runScripts: 'dangerously',
    resources: 'usable'
  });
  global.document = window.document;
  global.window = window;

  let loaded = new Promise((resolve, reject) => {
    window.onModulesLoaded = async () => {
      global.Snap = window.Snap

      resolve();
    };
  })

  module.exports = (kanji) => {
    return loaded.then(async () => {
      return getKanji(kanji);
    })
  }  
}

let styles = `
.stroke_order_diagram--outer_container {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.stroke_order_diagram--guide_line {
  fill: none;
  stroke: #ddd;
  stroke-width: 3;
  stroke-linecap: square;
  stroke-linejoin: square;
  stroke-dasharray:8, 8;
}

.stroke_order_diagram--bounding_box {
  fill: none;
  stroke: #ddd;
  stroke-width: 4;
  stroke-linecap: square;
  stroke-linejoin: square;
}

.stroke_order_diagram--current_path {
  fill: none;
  stroke: #000;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.stroke_order_diagram--existing_path {
  fill: none;
  stroke: #aaa;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin:round;
}

.stroke_order_diagram--path_start {
  fill: rgba(255, 0, 0, 0.7);
  stroke:none
}`;

let header = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.0//EN" "http://www.w3.org/TR/2001/REC-SVG-20010904/DTD/svg10.dtd" [
<!ATTLIST g
xmlns:kvg CDATA #FIXED "http://kanjivg.tagaini.net"
kvg:element CDATA #IMPLIED
kvg:variant CDATA #IMPLIED
kvg:partial CDATA #IMPLIED
kvg:original CDATA #IMPLIED
kvg:part CDATA #IMPLIED
kvg:number CDATA #IMPLIED
kvg:tradForm CDATA #IMPLIED
kvg:radicalForm CDATA #IMPLIED
kvg:position CDATA #IMPLIED
kvg:radical CDATA #IMPLIED
kvg:phon CDATA #IMPLIED >
<!ATTLIST path
xmlns:kvg CDATA #FIXED "http://kanjivg.tagaini.net"
kvg:type CDATA #IMPLIED >
]>`;

let circleWidth = 8;

let createCss = function() {
  let css = document.createElement('style');
  css.innerHTML = styles;
  return css;
}

var strokeOrderDiagram = function(element, svgDocument) {
  element.appendChild(createCss());
  var s = Snap(element);
  var diagramSize = 200;
  var coordRe = '(?:\\d+(?:\\.\\d+)?)';
  var strokeRe = new RegExp('^[LMT]\\s*(' + coordRe + ')[,\\s](' + coordRe + ')', 'i');
  var f = Snap(svgDocument);
  var allPaths = f.selectAll("path");
  var drawnPaths = [];
  var canvasWidth = (allPaths.length * diagramSize) / 2;
  var canvasHeight = diagramSize / 2;
  var frameSize = diagramSize / 2;
  var frameOffsetMatrix = new Snap.Matrix()
  frameOffsetMatrix.translate((-frameSize / 16)+2, (-frameSize / 16)+2);

  // Set drawing area
  s.node.style.width = canvasWidth + "px";
  s.node.style.height = canvasHeight + "px";
  s.node.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  s.node.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  // Draw global guides
  var boundingBoxTop = s.line(1, 1, canvasWidth-1, 1);
  var boundingBoxLeft = s.line(1, 1, 1, canvasHeight-1);
  var boundingBoxBottom = s.line(1, canvasHeight-1, canvasWidth-1, canvasHeight-1);
  var horizontalGuide = s.line(0, canvasHeight/2, canvasWidth, canvasHeight/2);
  boundingBoxTop.attr({"class": "stroke_order_diagram--bounding_box"});
  boundingBoxLeft.attr({"class": "stroke_order_diagram--bounding_box"});
  boundingBoxBottom.attr({"class": "stroke_order_diagram--bounding_box"});
  horizontalGuide.attr({"class": "stroke_order_diagram--guide_line"});

  // Draw strokes
  var pathNumber = 1;
  allPaths.forEach(function(currentPath) {
    var moveFrameMatrix = new Snap.Matrix()
    moveFrameMatrix.translate((frameSize * (pathNumber - 1)) - 4, -4);

    // Draw frame guides
    var verticalGuide = s.line((frameSize * pathNumber) - (frameSize / 2), 1, (frameSize * pathNumber) - (frameSize / 2), canvasHeight-1);
    var frameBoxRight = s.line((frameSize * pathNumber) - 1, 1, (frameSize * pathNumber) - 1, canvasHeight-1);
    verticalGuide.attr({"class": "stroke_order_diagram--guide_line"});
    frameBoxRight.attr({"class": "stroke_order_diagram--bounding_box"});

    // Draw previous strokes
    drawnPaths.forEach(function(existingPath) {
      var localPath = existingPath.clone();
      localPath.transform(moveFrameMatrix);
      localPath.attr({"class": "stroke_order_diagram--existing_path"})
      s.append(localPath);
    });

    // Draw current stroke
    currentPath.transform(frameOffsetMatrix);
    currentPath.transform(moveFrameMatrix);
    currentPath.attr({"class": "stroke_order_diagram--current_path"})
    s.append(currentPath);

    // Draw stroke start point
    var match = strokeRe.exec(currentPath.node.getAttribute('d'));
    var pathStartX = match[1];
    var pathStartY = match[2];
    var strokeStart = s.circle(pathStartX, pathStartY, circleWidth);
    strokeStart.attr({"class": "stroke_order_diagram--path_start"});
    strokeStart.transform(moveFrameMatrix);

    pathNumber++;
    drawnPaths.push(currentPath.clone());
  });
};



function initDiagram(response) {
  var el = document.createElement('svg');
  
  new strokeOrderDiagram(el, response);

  return el;
}

function getDomFromString(string) {
  var wrapper= document.createElement('div');
  wrapper.innerHTML = string;
  return wrapper.getElementsByTagName('svg')[0];
}

let baseUrl = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/'

function getCodePoint(kanji) {
  return kanji && kanji.codePointAt(0).toString(16).padStart(5, '0');
}

function getURL(kanji) {
  return `${baseUrl}${getCodePoint(kanji)}.svg`
}

async function getKanji(kanji, download) {
  return isNode ? getKanjiNode(kanji) : getKanjiBrowser(kanji, download);
}

async function getKanjiNode(kanji) {
  return new Promise((resolve, reject) => {
    require('request')(getURL(kanji), function(err, response, body) {
      if (err) {
        reject(err);
      }
      let diagram = initDiagram(getDomFromString(body));

      var wrapper= document.createElement('div');
      wrapper.appendChild(diagram);
      resolve(header + wrapper.innerHTML);
    });
  })
}

async function getKanjiBrowser(kanji, download) {
  return new Promise((resolve, reject) => {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          window.history.pushState('', '', `?kanji=${kanji}`)
          clearDiagram();
          
          let diagram = initDiagram(getDomFromString(this.response));
  
          document.getElementById('diagram-container').appendChild(diagram);
          // gotta self assign innerHTML because browsers are jank and it wont show the element otherwise
          document.getElementById('diagram-container').innerHTML = document.getElementById('diagram-container').innerHTML;
  
          if (download) {
            let blob = new Blob([document.getElementById('diagram-container').innerHTML], {type: 'image/svg+xml'})
            let url = window.URL.createObjectURL(blob)
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            // the filename you want
            a.download =  `${getCodePoint(kanji)}.svg`;
            // document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
          }
        }
    };
    xhttp.open("GET", getURL(kanji), true);
    xhttp.send();
  });
}

function clearDiagram() {
  document.getElementById('diagram-container').innerHTML = '';
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

if (!isNode) {
  document.addEventListener('DOMContentLoaded', function() {
    let kanji = getParameterByName('kanji');
    if (kanji) {
      let dl = getParameterByName('dl');
      document.getElementById('kanji').value = kanji;
      getKanji(kanji, dl === '1');
    }
  
    document.getElementById('diagram-form').addEventListener('submit', function(e) {
      getKanji(document.getElementById('kanji').value);
      e.preventDefault();
    })
    document.getElementById('download-diagram').addEventListener('click', function() {
      getKanji(document.getElementById('kanji').value, true);
    })
  });
}
