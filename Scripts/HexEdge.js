/**
 * Hexagon Edge Outline
 *
 * Script Effect — highlights the perimeter LEDs of hexagon fixtures.
 *
 * Edge pixels (top/bottom full rows + diagonal endpoints):
 *   Brightness > 25%  →  double the brightness
 *   Brightness ≤ 25%  →  add ~35% red
 *
 * Inner pixels (one step inward from each edge pixel):
 *   Subtle 50% brightness boost at half effect depth
 */

var _edgeSet  = {};
var _innerSet = {};

function buildSets(model) {
  var edges  = {};
  var inners = {};
  var hexagons = model.sub("hexagon");
  for (var i = 0; i < hexagons.size(); i++) {
    var hex    = hexagons.get(i);
    var strips = hex.children;
    var n      = strips.length;
    for (var s = 0; s < n; s++) {
      var pts = strips[s].points;
      var len = pts.length;
      if (s === 0 || s === n - 1) {
        // Full top/bottom edge rows
        for (var p = 0; p < len; p++) {
          edges[pts[p].index] = true;
        }
        // Inner: endpoints of the adjacent strip
        var adj    = (s === 0) ? strips[1] : strips[n - 2];
        var adjPts = adj.points;
        inners[adjPts[0].index] = true;
        inners[adjPts[adjPts.length - 1].index] = true;
      } else {
        // Diagonal sides: just the endpoints
        edges[pts[0].index] = true;
        edges[pts[len - 1].index] = true;
        // Inner: second point from each end
        if (len > 2) {
          inners[pts[1].index] = true;
          inners[pts[len - 2].index] = true;
        }
      }
    }
  }
  return { edges: edges, inners: inners };
}

function init(model) {
  var sets  = buildSets(model);
  _edgeSet  = sets.edges;
  _innerSet = sets.inners;
}

function renderPoint(point, deltaMs, enabledAmount, inputColor) {
  if (_edgeSet[point.index]) {
    var b      = LXColor.b(inputColor);
    var target = (b > 25)
      ? LXColor.multiply(inputColor, 2.0)       // bright pixel: double brightness
      : LXColor.add(inputColor, rgb(156, 68, 228));  // dark pixel: add ~35% red
    return LXColor.lerp(inputColor, target, enabledAmount);
  }
  if (_innerSet[point.index]) {
    var b2     = LXColor.b(inputColor);
    var target2 = (b2 > 25)
      ? LXColor.multiply(inputColor, 2.0)
      : LXColor.add(inputColor, rgb(156, 68, 228));
    return LXColor.lerp(inputColor, target2, enabledAmount);
  }
  return inputColor;
}
