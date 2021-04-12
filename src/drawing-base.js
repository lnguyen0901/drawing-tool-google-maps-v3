import { drag } from 'd3-drag';
import ProjectionUtility from './projection-utility';
import { select } from 'd3-selection';
import Helper from './helper';
import { DrawingConst } from './constants';

export default class DrawingBase {

  get curGeometry() {
    return this._data.get(this._curGeomIndex);
  }

  get curNodes() {
    return Object.assign([], this.geometry() ? this.geometry().nodes : []);
  }

  constructor(map) {
    this._map = map;
    this._map.setClickableIcons(false);
    this._events = new Map();
    this._data = new Map();
    this._drawing = null;
    this._helper = new Helper();
    this._init();
  }

  addListener(event, cb) {
    this._events.set(event, cb);
  }

  removeListener(event) {
    this._events.delete(event);
  }

  geometry(index = 0) {
    if (index === 0) {
      return this.curGeometry;
    }

    return this._data.get(index);
  }

  geometries() {
    return this._data;
  }

  addGeometry(geom) {
    const keys = Array.from(this._data.keys());
    this._curGeomIndex = (keys.length === 0 ? 0 : keys.pop()) + 1;
    this._data.set(this._curGeomIndex, geom);
  }

  removeGeometry(index) {
    this._data.delete(index);
    this._curGeomIndex = 0;
  }

  _init() {
    this._containerDiv = this._map.getDiv().querySelector('div:first-child');
    this._initOverlay();
  }

  _initOverlay() {
    this._setOverlay();
    this._initCompleted = false;
  }

  _setOverlay() {
    this._overlay = new google.maps.OverlayView();
    this._overlay.onAdd = this._onAddOverlay.bind(this);
    this._overlay.draw = this._onDrawOverlay.bind(this);
    this._overlay.setMap(this._map);
  }

  _onAddOverlay() {
    this._initCompleted = true;

    this._projection = this._overlay.getProjection();
    this._projectionUtils = new ProjectionUtility(this._containerDiv, this._projection);

    // add svg overlay
    this._svgOverlay = select(this._overlay.getPanes().overlayMouseTarget)
      .append('div')
      .attr('id', 'drawing-tool-container')
      .append('svg')
      .attr('class', 'drawing-tool-svg-overlay');

    // line base
    this._svgObjs = this._svgOverlay.append('g').attr('class', 'base');
    this._svgObjs.selectAll('rect').data([]);
    this._svgObjs.selectAll('circle').data([]);
    this._svgObjs.selectAll('line').data([]);

    // node circles
    this._nodeCircles = this._svgOverlay.append('g').attr('class', 'node-circle');

    // // touch circles
    this._touchCircles = this._svgOverlay.append('g').attr('class', 'touch-circle');

    // segment
    this._segmentText = this._svgOverlay.append('g').attr('class', 'segment-text');

    // node text
    this._nodeText = this._svgOverlay.append('g').attr('class', 'node-text');
  }

  _onDrawOverlay() {
    this._updateNodeCircles();
    this._updateNodeTouchCircles();
  }

  _updateNodeCircles() {
    if (this._curGeomIndex <= 0) {
      this._nodeCircles.selectAll('circle').remove();
      return;
    }

    const self = this;
    const circles = this._nodeCircles
      .selectAll('circle')
      .data(this.curNodes)
      .join('circle')
      .datum((d, i) => [d, i])
      .attr('class', ([, i]) => i === 0 ? 'cover-circle head-circle' : 'cover-circle')
      .attr('r', DrawingConst.nodeTargetRadius)
      .attr('cx', ([d]) => this._projectionUtils.latLngToSvgPoint(d)[0])
      .attr('cy', ([d]) => this._projectionUtils.latLngToSvgPoint(d)[1])
      .on('mouseover', function (evt, [d, i]) {
        self._onOverCircle(d, i, this);
      })
      .on('mouseout', function(evt, [d, i]) {
        self._onOutCircle(d, i, this);
      })
      .on('mousedown', () => {});

    // enter and seat the new data with same style.
    circles
      .enter()
      .append('circle')
      .attr('class', 'cover-circle')
      .attr('r', DrawingConst.nodeTargetRadius)
      .attr('cx', ([d]) => this._projectionUtils.latLngToSvgPoint(d)[0])
      .attr('cy', ([d]) => this._projectionUtils.latLngToSvgPoint(d)[1])
      .on('mouseover', function (evt, [d, i]) {
        self._onOverCircle(d, i, this);
      })
      .on('mouseout', function(evt, [d, i]) {
        self._onOutCircle(d, i, this);
      })
      .on('mousedown', () => {});

    this._nodeCircles.selectAll('.removed-circle').remove();
  }

  _updateNodeTouchCircles() {
    if (this._curGeomIndex <= 0 || this._drawing) {
      this._touchCircles
        .selectAll('circle').remove();
      return;
    }

    const self = this;
    const circles = this._touchCircles
      .selectAll('circle')
      .data(this.curNodes)
      .join('circle')
      .datum((d, i) => [d, i])
      .attr('class', ([, i]) => i === 0 ? 'touch-circle head-circle' : 'touch-circle')
      .attr('r', DrawingConst.nodeTargetRadius)
      .attr('cx', ([d]) => this._projectionUtils.latLngToSvgPoint(d)[0])
      .attr('cy', ([d]) => this._projectionUtils.latLngToSvgPoint(d)[1])
      .on('mouseover', function(evt, [d, i]) {
        self._onOverCircle(d, i, this);
      })
      .on('mouseout', function(evt, [d, i]) {
        self._onOutCircle(d, i, this);
      })
      .on('touchstart', function(evt, [d, i]) {
        evt.preventDefault();
        self._onOverCircle(d, i, this);
      })
      .on('touchend', function(evt, [d, i]) {
        evt.preventDefault();
        self._onOutCircle(d, i, this);
      })
      .call(this._onDragCircle());

    circles
      .enter()
      .append('circle')
      .attr('class', ([, i]) => i === 0 ? 'touch-circle head-circle' : 'touch-circle')
      .attr('r', DrawingConst.nodeTargetRadius)
      .attr('cx', ([d]) => this._projectionUtils.latLngToSvgPoint(d)[0])
      .attr('cy', ([d]) => this._projectionUtils.latLngToSvgPoint(d)[1])
      .on('mouseover', function(evt, [d, i]) {
        self._onOverCircle(d, i, this);
      })
      .on('mouseout', function(evt, [d, i]) {
        self._onOutCircle(d, i, this);
      })
      .on('touchstart', function(evt, [d, i]) {
        evt.preventDefault();
        self._onOverCircle(d, i, this);
      })
      .on('touchend', function(evt, [d, i]) {
        evt.preventDefault();
        self._onOutCircle(d, i, this);
      })
      .call(this._onDragCircle());
  }

  _mapClickFunc() {
    this._overlay.draw();
    this._dragged = false;
  }

  // start to drawing
  _draw() {
    // remove svg overlay event
    if (this._svgOverlayEvent) {
      this._svgOverlay.on('click', null);
      this._svgOverlayEvent = null;
    }

    if (this._mapRectMouseMoveEvent) {
      this._mapRectMouseMoveEvent.remove();
    }
    if (this._mapCircleMouseMoveEvent) {
      this._mapCircleMouseMoveEvent.remove();
    }
    if (this._mapPolygonClickEvent) {
      this._mapPolygonClickEvent.remove();
    }

    if (this._mapClickEvent) {
      this._mapClickEvent.remove();
    }

    this._mapClickEvent = this._map.addListener('click', evt => this._mapClickFunc(evt));

    this._map.setOptions({
      dragableCursor: 'default'
    });
  }

  _onOverCircle(d, i, target) {
    if (this._dragging) {
      return;
    }

    let selection = select(target);

    if (!selection.classed('base')) {
      selection = this._nodeCircles.select(`circle:nth-child(${i + 1})`);
    }

    selection.attr('r', DrawingConst.nodeTargetExpandRadius);
  }

  _onOutCircle(d, i, target) {
    let selection = select(target);

    if (!selection.classed('base')) {
      selection = this._nodeCircles.select(`circle:nth-child(${i + 1})`);
    }

    selection.attr('r', DrawingConst.nodeTargetRadius);
  }

  _onDragCircle() {
    const self = this;
    let isDragged = false;
    const dragable = drag();

    dragable.on('drag', function(evt, [, i]) {
      isDragged = true;
      self._dragging = true;

      self._updateCirclePosition(i, evt);
      self.onCircleDragging(evt, i);
    });

    dragable.on('start', function(evt) {
      evt.sourceEvent.stopPropagation();
      select(this).raise().attr('r', DrawingConst.nodeTargetExpandRadius);
      self._disableMapScroll();
      self.onCircleDragStart(evt);
    });

    dragable.on('end', function(evt, [, i]) {
      self._enableMapScroll();

      if (!isDragged) {
        if (i > 0) {
          select(this).classed('removed-circle', true);
        } else {
          self._dragged = true;
        }
      } else {
        self.onCircleDragEnd(evt, i);
      }

      isDragged = false;
      self._dragging = false;
      self._overlay.draw();
    });

    return dragable;
  }

  onCircleDragging() {}
  onCircleDragStart() {}
  onCircleDragEnd() {}

  _disableMapScroll() {
    this._zoomControl = !!document.querySelector(`button[aria-label="Zoom in"]`);
    this._map.setOptions({
      scrollwheel: false,
      gestureHandling: 'none',
      zoomControl: false,
    });
  }

  _enableMapScroll() {
    this._map.setOptions({
      scrollwheel: true,
      gestureHandling: 'auto',
      zoomControl: this._zoomControl,
    });
  }

  _updateCirclePosition(i, evt) {
    this._nodeCircles.select(`circle:nth-child(${i + 1})`)
      .attr('cx', evt.x)
      .attr('cy', evt.y);
  }
}