/**
 * CubeRotate
 *
 * Script Pattern — renders a rotating wireframe cube independently on each
 * hexagon panel, treating each one as its own 2D screen.
 *
 * init()      — precomputes a local UV coordinate for every hexagon LED
 * preRender() — rotates + projects the 8 cube vertices once per frame
 * renderPoint() — 12 segment-distance tests to find the nearest edge
 */

knob("speed",     "Speed",      "Rotation speed",      0.3);
knob("edgeWidth", "Edge Width", "Cube edge thickness", 0.3);

var _pointUV   = {};   // point.index → {u, v}
var _projVerts = [];   // 8 projected {x,y}, refreshed each frame
var _time      = 0;
var _tint      = { r: 255, g: 200, b: 80 };

var VERTS = [
  [-1,-1,-1], [1,-1,-1], [1,1,-1], [-1,1,-1],
  [-1,-1, 1], [1,-1, 1], [1,1, 1], [-1,1, 1]
];
var EDGES = [
  [0,1],[1,2],[2,3],[3,0],
  [4,5],[5,6],[6,7],[7,4],
  [0,4],[1,5],[2,6],[3,7]
];

// ── init: build UV map from world positions ──────────────────────────────────

function init(model) {
  _pointUV = {};
  var hexagons = model.sub("hexagon");
  for (var i = 0; i < hexagons.size(); i++) {
    var hex    = hexagons.get(i);
    var pts    = hex.points;
    var strips = hex.children;
    if (!strips || strips.length < 3 || pts.length === 0) continue;

    // Hexagon centre
    var cx = 0, cy = 0, cz = 0;
    for (var p = 0; p < pts.length; p++) { cx += pts[p].x; cy += pts[p].y; cz += pts[p].z; }
    cx /= pts.length; cy /= pts.length; cz /= pts.length;

    // Local X = direction of the widest (middle) strip
    var mid  = strips[Math.floor(strips.length / 2)];
    var mp   = mid.points;
    var dxr  = mp[mp.length-1].x - mp[0].x;
    var dyr  = mp[mp.length-1].y - mp[0].y;
    var dzr  = mp[mp.length-1].z - mp[0].z;
    var dlen = Math.sqrt(dxr*dxr + dyr*dyr + dzr*dzr) || 1;
    var lx   = { x: dxr/dlen, y: dyr/dlen, z: dzr/dlen };

    // Local Y = bottom-strip-centre to top-strip-centre, orthogonalised vs lx
    var bot = strips[0].points, top = strips[strips.length-1].points;
    var bx=0,by=0,bz=0, tx=0,ty=0,tz=0;
    for (var q = 0; q < bot.length; q++) { bx+=bot[q].x; by+=bot[q].y; bz+=bot[q].z; }
    for (var q = 0; q < top.length; q++) { tx+=top[q].x; ty+=top[q].y; tz+=top[q].z; }
    bx/=bot.length; by/=bot.length; bz/=bot.length;
    tx/=top.length; ty/=top.length; tz/=top.length;
    var uyx=tx-bx, uyy=ty-by, uyz=tz-bz;
    var dot = uyx*lx.x + uyy*lx.y + uyz*lx.z;
    uyx -= dot*lx.x; uyy -= dot*lx.y; uyz -= dot*lx.z;
    var ylen = Math.sqrt(uyx*uyx + uyy*uyy + uyz*uyz) || 1;
    var ly   = { x: uyx/ylen, y: uyy/ylen, z: uyz/ylen };

    // Find max half-extent (use same scale for both axes → square pixels)
    var maxE = 0;
    for (var p = 0; p < pts.length; p++) {
      var ex = pts[p].x-cx, ey = pts[p].y-cy, ez = pts[p].z-cz;
      var uu = Math.abs(ex*lx.x + ey*lx.y + ez*lx.z);
      var vv = Math.abs(ex*ly.x + ey*ly.y + ez*ly.z);
      if (uu > maxE) maxE = uu;
      if (vv > maxE) maxE = vv;
    }
    if (maxE < 0.001) continue;

    // Store UV ∈ [-1, 1] for every LED in this hexagon
    for (var p = 0; p < pts.length; p++) {
      var ex = pts[p].x-cx, ey = pts[p].y-cy, ez = pts[p].z-cz;
      _pointUV[pts[p].index] = {
        u: (ex*lx.x + ey*lx.y + ez*lx.z) / maxE,
        v: (ex*ly.x + ey*ly.y + ez*ly.z) / maxE
      };
    }
  }
}

// ── preRender: rotate cube + project vertices once per frame ─────────────────

function preRender(deltaMs) {
  _time += deltaMs;

  // Cache swatch tint
  // var sc = (_swatch.numColors > 0) ? (_swatch.colors[0] & 0xFFFFFF) : (0xFF << 16 | 0xC8 << 8 | 0x50);
  // _tint  = { r: (sc >> 16) & 0xFF, g: (sc >> 8) & 0xFF, b: sc & 0xFF };

  // Rotation angles (three independent rates)
  var rate = speed * 0.06;
  var yr   = _time * rate       * Math.PI / 180;
  var pr   = _time * rate * 0.7 * Math.PI / 180;
  var rr   = _time * rate * 0.4 * Math.PI / 180;

  _projVerts = [];
  for (var i = 0; i < VERTS.length; i++) {
    var x = VERTS[i][0], y = VERTS[i][1], z = VERTS[i][2];
    // Yaw
    var x1 = x*Math.cos(yr) - z*Math.sin(yr), z1 = x*Math.sin(yr) + z*Math.cos(yr);
    // Pitch
    var y2 = y*Math.cos(pr) - z1*Math.sin(pr), z2 = y*Math.sin(pr) + z1*Math.cos(pr);
    // Roll
    var x3 = x1*Math.cos(rr) - y2*Math.sin(rr), y3 = x1*Math.sin(rr) + y2*Math.cos(rr);
    // Perspective projection — cube centred at z=0, viewed from z=+3
    var zv = z2 + 3;
    if (zv < 0.1) zv = 0.1;
    var s = 1.5 / zv;
    _projVerts.push({ x: x3 * s, y: y3 * s });
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function segDist(px, py, ax, ay, bx, by) {
  var dx = bx-ax, dy = by-ay, len2 = dx*dx + dy*dy;
  if (len2 < 1e-6) return Math.sqrt((px-ax)*(px-ax) + (py-ay)*(py-ay));
  var t  = Math.max(0, Math.min(1, ((px-ax)*dx + (py-ay)*dy) / len2));
  var qx = ax + t*dx, qy = ay + t*dy;
  return Math.sqrt((px-qx)*(px-qx) + (py-qy)*(py-qy));
}

// ── renderPoint ───────────────────────────────────────────────────────────────

function renderPoint(point, deltaMs) {
  var uv = _pointUV[point.index];
  if (!uv) return rgb(0, 0, 0);

  var minD = 9999;
  for (var e = 0; e < EDGES.length; e++) {
    var a = _projVerts[EDGES[e][0]], b = _projVerts[EDGES[e][1]];
    var d = segDist(uv.u, uv.v, a.x, a.y, b.x, b.y);
    if (d < minD) minD = d;
  }

  var ew = edgeWidth * 0.22 + 0.03;
  if (minD < ew) {
    var t = 1 - minD / ew;
    t = t * t;
    return rgb(
      Math.round(_tint.r * t),
      Math.round(_tint.g * t),
      Math.round(_tint.b * t)
    );
  }
  return rgb(0, 0, 0);
}
