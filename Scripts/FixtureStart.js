/**
 * Fixture Start Indicator
 *
 * Lights the first N LEDs of every fixture white to help identify
 * wiring start points and data direction. All other LEDs are dark.
 *
 * Adjust "Num LEDs" in the inspector to show more or fewer start LEDs.
 */

knob("numleds", "Num LEDs", "Number of start LEDs to highlight per fixture (maps to 1-10)", 0.8);

var _cache = {};
var _lastCount = -1;

function buildCache(count, model) {
  var set = {};
  var children = model.children;
  for (var i = 0; i < children.length; i++) {
    var pts = children[i].points;
    var n = Math.min(count, pts.length);
    for (var j = 0; j < n; j++) {
      set[pts[j].index] = true;
    }
  }
  return set;
}

function preRender(deltaMs, nowMillis, model) {
  var count = Math.max(1, Math.round(numleds * 9) + 1);
  if (count !== _lastCount) {
    _lastCount = count;
    _cache = buildCache(count, model);
  }
}

function renderPoint(point, deltaMs) {
  return _cache[point.index] ? rgb(255, 255, 255) : rgb(0, 0, 0);
}
