import GeometryRect from './geometry/rect';
import GeometryCircle from './geometry/circle';
import DrawingBase from './drawing-base';
import { DrawingConst } from './constants';
import './index.scss';
import Helper from './helper';
import { EVENT_END, EVENT_OVERLAPPED } from './events';
import GeometryPolygon from './geometry/polygon';
import { select } from 'd3-selection';

const marginTopText = DrawingConst.marginTopText;

export default class Drawing extends DrawingBase {

  get rects() {
    const data = [];

    this._data.forEach((geom, key) => {
      if (geom instanceof GeometryRect) {
        data.push({
          id: key,
          geom: geom
        });
      }
    });

    return data;
  }

  get circles() {
    const data = [];

    this._data.forEach((geom, key) => {
      if (geom instanceof GeometryCircle) {
        data.push({
          id: key,
          geom: geom
        });
      }
    });

    return data;
  }

  get polygons() {
    const data = [];

    this._data.forEach((geom, key) => {
      if (geom instanceof GeometryPolygon) {
        data.push({
          id: key,
          geom: geom
        });
      }
    });

    return data;
  }

  get area() {
    let totalArea = 0;
    this.geometries().forEach((geom) => {
      totalArea += geom.area;
    });

    return totalArea;
  }

  _init() {
    super._init();

    // add event
    this._containerDiv.addEventListener('keydown', (event) => {
      const code = event.code.toUpperCase();
      switch (code) {
        case 'DELETE':
          // delete obj selecting
          const index = this._curGeomIndex;

          if (index) {
            this.removeGeometry(index);
          }

          if (typeof this._events.get(EVENT_OVERLAPPED) === 'function') {
            this._events.get(EVENT_OVERLAPPED)(this.checkIntersection());
          }
          break;
      }
    });

    // create event for drawing tool

  }

  _onDrawOverlay() {
    super._onDrawOverlay();

    // update rectangle
    this._updateRectangle();
    // update circle
    this._updateCircle();
    // update polygon
    this._updatePolygon();

    // dispatchEvent
    this._dispatchDrawingEvent();
  }

  _dispatchDrawingEvent() {
    if (this._drawing) {
      return;
    }

    if (typeof this._events.get(EVENT_END) === 'function') {
      this._events.get(EVENT_END)(this._results());
    }
  }

  _results() {
    const totalArea = this.area;
    return {
      area: totalArea,
      areaText: this._helper.formatArea(totalArea)
    };
  }

  setData(data) {
    if (!data) {
      return;
    }

    data.forEach(geom => {
      switch(geom.type) {
        case 'circle':
          this.addGeometry(new GeometryCircle(this._projectionUtils, geom));
          break;
        case 'rect':
          this.addGeometry(new GeometryRect(geom));
          break;
        case 'polygon':
          this.addGeometry(new GeometryPolygon(geom));
          break;
      }
      this.drawEnd(true);
    });

    this._curGeomIndex = 0;
    this._overlay.draw();
    this._dragged = false;

    if (typeof this._events.get(EVENT_OVERLAPPED) === 'function') {
      this._events.get(EVENT_OVERLAPPED)(this.checkIntersection());
    }
  }

  data() {
    let data = [];
    this.geometries().forEach(geom => {
      data.push(geom.data());
    });

    return data;
  }

  checkIntersection() {
    let elements = [];

    this._svgObjs.selectAll(`circle, rect, polygon`)
    .each(function() {
      const el = select(this);
      elements.push(el._groups[0][0]);
    });

    if (elements.length === 0) {
      return false;
    }

    const svg = this._svgOverlay.node();

    for (let i = 0; i < elements.length; i++) {
      const ele1 = elements[i];
      const ele1Id = ele1.getAttribute('id');

      let points = [];
      // get points
      switch(ele1.tagName) {
        case 'circle':
          const cx = Number(ele1.getAttribute('cx'));
          const cy = Number(ele1.getAttribute('cy'));
          const r = Number(ele1.getAttribute('r'));
          points = Helper.circlePoints(cx, cy, r);
          break;
        case 'rect':
          const x = Number(ele1.getAttribute('x'));
          const y = Number(ele1.getAttribute('y'));
          const w = Number(ele1.getAttribute('width'));
          const h = Number(ele1.getAttribute('height'));
          points = Helper.rectPoints(x, y, w, h);
          break;
        case 'polygon':
          points = ele1.getAttribute('points').split(' ').map(e => e.split(',').map(f => Number(f)));
          break;
      }

      for (let j = 0; j < elements.length; j++) {
        const ele2 = elements[j];
        const ele2Id = ele2.getAttribute('id');

        if (ele1Id === ele2Id) {
          continue;
        }

        for (let z = 0; z < points.length; z++) {
          const p = points[z];
          let point = svg.createSVGPoint();
          point.x = p[0];
          point.y = p[1];

          if (ele2.isPointInFill(point) || ele2.isPointInStroke(point)) {
            return true;
          }
        };
      }
    }

    return false;
  }

  removeGeometry(index) {
    super.removeGeometry(index);

    let selectors = `rect[id=rect-${index}], circle[id=circle-${index}], line[id=line-${index}],`;
      selectors += `g[id=g-rect-${index}], g[id=g-circle-${index}],`;
      selectors += `polygon[id=polygon-${index}], g[id=gpolygon-${index}], g[id=g-polygon-${index}]`;

    this._svgOverlay
      .selectAll(selectors)
      .remove();
    this._overlay.draw();
  }

  _mapClickFunc(evt) {
    if (!this._dragged
    && this._touchCircles.selectAll(`circle[r="${DrawingConst.nodeTargetExpandRadius}"]`).size() === 0) {
      const node = [evt.latLng.lng(), evt.latLng.lat()];

      // is rect drawing
      if (this.geometry() instanceof GeometryRect) {
        this.geometry().setFirstPoint(node);
        this._mapClickEvent.remove();

        this._mapRectMouseMoveEvent = this._map.addListener('mousemove', (evt2) => {
          this.geometry().setEndPoint([evt2.latLng.lng(), evt2.latLng.lat()]);
          this._overlay.draw();
          this._dragged = false;
        });

        this._mapClickEvent = this._map.addListener('click', (evt2) => {
          this.geometry().setEndPoint([evt2.latLng.lng(), evt2.latLng.lat()]);
          this._mapClickEvent.remove();
          this._mapRectMouseMoveEvent.remove();
          this.drawEnd();
        });
      }

      // is circle drawing
      if (this.geometry() instanceof GeometryCircle) {
        this.geometry().setCenter(node);
        this._mapClickEvent.remove();

        this._mapCircleMouseMoveEvent = this._map.addListener('mousemove', (evt2) => {
          this.geometry().setEndPoint([evt2.latLng.lng(), evt2.latLng.lat()]);
          this._overlay.draw();
          this._dragged = false;
        });

        this._mapClickEvent = this._map.addListener('click', (evt2) => {
          this.geometry().setEndPoint([evt2.latLng.lng(), evt2.latLng.lat()]);
          this._mapClickEvent.remove();
          this._mapCircleMouseMoveEvent.remove();
          this.drawEnd();
        });
      }

      // polygon drawing
      if (this.geometry() instanceof GeometryPolygon) {
        this.geometry().addPoint(node);
        this._overlay.draw();

        this._mapPolygonClickEvent = this._map.addListener('rightclick', () => {
          this.geometry().setClosed();
          this._mapClickEvent.remove();
          this._mapPolygonClickEvent.remove();
          this.drawEnd();
        });
      }
    }

    super._mapClickFunc(evt);
  }

  onCircleDragging(evt, i) {
    super.onCircleDragging(evt, i);

    // if (typeof this._events.get(EVENT_OVERLAPPED) === 'function') {
    //   this._events.get(EVENT_OVERLAPPED)(this.checkIntersection());
    // }

    if (this.geometry() instanceof GeometryRect) {
      this._updateRectPosition(i, evt);
      this._updateRectNode(i, evt);
      this._updateNodeCircles();
      this._updateSegmentTextRect();
    }

    if (this.geometry() instanceof GeometryCircle) {
      this._updateCirclePosition(i, evt);
      this._updateCircleNode(i, evt);
      this._updateNodeCircles();
      this._updateSegmentTextCircle();
    }

    if (this.geometry() instanceof GeometryPolygon) {
      this._updatePolygonPosition(i, evt);
      this._updatePolygonNode(i, evt);
      this._updateNodeCircles();
      this._updateSegmentTextPolygon();
    }
  }

  // draw polygon start ==================
  drawPolygon() {
    if (this._drawing === 'polygon') {
      return;
    }

    // remove geometries not valid
    this.geometries().forEach((geom, index) => {
      if (!geom.isValid) {
        this.removeGeometry(index);
      }
    });

    this.addGeometry(new GeometryPolygon());
    this._draw();
    this._drawing = 'polygon';
  }

  _updatePolygon() {
    const polygons = this._svgObjs.selectAll('polygon[id^=polygon-]')
      .data(this.polygons)
      .attr('class', d => `base-line${d.geom.isClosed ? '' : ' none'}`)
      .attr('points', d => {
        const nodes = d.geom.coordinates;
        let points = [];

        nodes.forEach((node) => {
          const s = this._projectionUtils.latLngToSvgPoint(node);
          points.push(`${s[0]},${s[1]}`);
        });

        return points.join(' ');
      });

    if (this.geometry() instanceof GeometryPolygon) {
      polygons.enter()
        .append('polygon')
        .attr('id', d => `polygon-${d.id}`)
        .attr('class', d => `base-line${this.geometry(d.id).isClosed ? '' : ' none'}`)
        .attr('points', d => {
          const nodes = this.geometry(d.id).coordinates;
          let points = [];

          nodes.forEach((node) => {
            const s = this._projectionUtils.latLngToSvgPoint(node);
            points.push(`${s[0]},${s[1]}`);
          });

          return points.join(' ');
        });
    }

    const gpolygons = this._svgObjs.selectAll('g[id^=gpolygon-]')
      .data(this.polygons)
      .attr('id', d => `gpolygon-${d.id}`)
      .attr('class', d => `${this.geometry(d.id).isClosed ? 'none' : ''}`);

    gpolygons
      .enter()
      .append('g')
      .attr('id', d => `gpolygon-${d.id}`)
      .attr('class', d => `${this.geometry(d.id).isClosed ? 'none' : ''}`);

    const lines = gpolygons
      .selectAll('line')
      .data(d => this.geometry(d.id).lines)
      .attr('class', 'base-line')
      .attr('x1', d => this._projectionUtils.latLngToSvgPoint(d[0])[0])
      .attr('y1', d => this._projectionUtils.latLngToSvgPoint(d[0])[1])
      .attr('x2', d => this._projectionUtils.latLngToSvgPoint(d[1])[0])
      .attr('y2', d => this._projectionUtils.latLngToSvgPoint(d[1])[1]);

    lines.enter()
      .append('line')
      .attr('class', 'base-line')
      .attr('x1', d => this._projectionUtils.latLngToSvgPoint(d[0])[0])
      .attr('y1', d => this._projectionUtils.latLngToSvgPoint(d[0])[1])
      .attr('x2', d => this._projectionUtils.latLngToSvgPoint(d[1])[0])
      .attr('y2', d => this._projectionUtils.latLngToSvgPoint(d[1])[1]);

    this._updateSegmentTextPolygon();
  }

  _updateSegmentTextPolygon() {
    const groups = this._segmentText
      .selectAll('g[id^=g-polygon-]')
      .data(this.polygons);

    groups
      .enter()
      .append('g')
      .attr('id', d => `g-polygon-${d.id}`);

    const text = groups
      .selectAll('text')
      .data(d => this.geometry(d.id).lines)
      .attr('class', 'segment-measure-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'text-before-edge')
      .attr('transform', (d) => {
        let p1 = this._projectionUtils.latLngToSvgPoint(d[0]);
        let p2 = this._projectionUtils.latLngToSvgPoint(d[1]);
        return Helper.transformText(p1, p2, marginTopText);
      })
      .text(d => this._helper.formatLength(this._helper.computeLengthBetween(d[0], d[1])));

    text
      .enter()
      .append('text')
      .attr('class', 'segment-measure-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'text-before-edge')
      .attr('transform', (d) => {
        let p1 = this._projectionUtils.latLngToSvgPoint(d[0]);
        let p2 = this._projectionUtils.latLngToSvgPoint(d[1]);
        return Helper.transformText(p1, p2, marginTopText);
      })
      .text(d => this._helper.formatLength(this._helper.computeLengthBetween(d[0], d[1])));

    text.exit().remove();
  }

  _updatePolygonPosition(i, evt) {
    const polygon = this._svgObjs.select(`polygon[id=polygon-${this._curGeomIndex}]`);
    if (polygon.size() === 0) {
      return;
    }

    let points = polygon.attr('points').split(' ').map((d) => d.split(',').map(e => Number(e)));

    if (i === points.length) { // move polygon
      // re-calculate points
      const center = this._projectionUtils.latLngToSvgPoint(this.geometry().center);
      points = points.map(node => {
        node[0] += evt.x - center[0];
        node[1] += evt.y - center[1];
        return node;
      });
    } else {
      points[i] = [evt.x, evt.y];
    }

    polygon.attr('points', () => {
      return points.map(d => d.join(',')).join(' ');
    });
  }

  _updatePolygonNode(i, evt) {
    const point = this._projectionUtils.svgPointToLatLng([evt.x, evt.y]);

    if (i === this.geometry().coordinates.length) { // move polygon
      // re-calculate points
      const center = this.geometry().center;
      const coordinates = this.geometry().coordinates.map(coord => {
        coord[0] += point[0] - center[0];
        coord[1] += point[1] - center[1];
        return coord;
      });
      this.geometry().updatePoints(coordinates);
    } else {
      this.geometry().updatePoint(i, point);
    }
  }
  // draw polygon end ====================

  // draw circle start ====================
  drawCircle() {
    if (this._drawing === 'circle') {
      return;
    }

    // remove geometries not valid
    this.geometries().forEach((geom, index) => {
      if (!geom.isValid) {
        this.removeGeometry(index);
      }
    });

    this.addGeometry(new GeometryCircle(this._projectionUtils));
    this._draw();
    this._drawing = 'circle';
  }

  _updateCircle() {
    const circles = this._svgObjs.selectAll('circle')
      .data(this.circles)
      .attr('class', 'base-line')
      .attr('cx', d => this._projectionUtils.latLngToSvgPoint(d.geom.center)[0])
      .attr('cy', d => this._projectionUtils.latLngToSvgPoint(d.geom.center)[1])
      .attr('r', d => {
        const center = d.geom.center;
        const endpoint = d.geom.endpoint;
        let r = 0; // radius

        if (center.length && endpoint.length) {
          const point1 = this._projectionUtils.latLngToSvgPoint(center);
          const point2 = this._projectionUtils.latLngToSvgPoint(endpoint);
          const a = Math.abs(point1[0] - point2[0]);
          const b = Math.abs(point1[1] - point2[1]);
          r = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
        }

        return r || 1;
      });

    if (this.geometry() instanceof GeometryCircle) {
      const center = this.geometry().center;
      const endpoint = this.geometry().endpoint;

      if (center.length && endpoint.length) {
        const point1 = this._projectionUtils.latLngToSvgPoint(center);
        const point2 = this._projectionUtils.latLngToSvgPoint(endpoint);
        const a = Math.abs(point1[0] - point2[0]);
        const b = Math.abs(point1[1] - point2[1]);
        const r = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));

        circles.enter()
          .append('circle')
          .attr('id', `circle-${this._curGeomIndex}`)
          .attr('class', 'base-line')
          .attr('cx', point1[0])
          .attr('cy', point1[1])
          .attr('r', r || 1);
      }
    }

    const gcircles = this._svgObjs.selectAll('g[id^=gcircle-]')
      .data(this.circles)
      .attr('id', d => `gcircle-${d.id}`);

    gcircles
      .enter()
      .append('g')
      .attr('id', d => `gcircle-${d.id}`);

    const lines = gcircles
      .selectAll('line')
      .data(d => this.geometry(d.id).lines)
      .attr('class', 'base-line')
      .attr('x1', d => this._projectionUtils.latLngToSvgPoint(d[0])[0])
      .attr('y1', d => this._projectionUtils.latLngToSvgPoint(d[0])[1])
      .attr('x2', d => this._projectionUtils.latLngToSvgPoint(d[1])[0])
      .attr('y2', d => this._projectionUtils.latLngToSvgPoint(d[1])[1]);

    lines.enter()
      .append('line')
      .attr('class', 'base-line')
      .attr('x1', d => this._projectionUtils.latLngToSvgPoint(d[0])[0])
      .attr('y1', d => this._projectionUtils.latLngToSvgPoint(d[0])[1])
      .attr('x2', d => this._projectionUtils.latLngToSvgPoint(d[1])[0])
      .attr('y2', d => this._projectionUtils.latLngToSvgPoint(d[1])[1]);

    this._updateSegmentTextCircle();
  }

  _updateSegmentTextCircle() {
    const groups = this._segmentText
      .selectAll('g[id^=g-circle-]')
      .data(this.circles);

    groups
      .enter()
      .append('g')
      .attr('id', d => `g-circle-${d.id}`);

    const text = groups
      .selectAll('text')
      .data(d => this.geometry(d.id).lines)
      .attr('class', 'segment-measure-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'text-before-edge')
      .attr('transform', (d) => {
        let p1 = this._projectionUtils.latLngToSvgPoint(d[0]);
        let p2 = this._projectionUtils.latLngToSvgPoint(d[1]);
        return Helper.transformText(p1, p2, marginTopText);
      })
      .text(d => this._helper.formatLength(this._helper.computeLengthBetween(d[0], d[1])));

    text
      .enter()
      .append('text')
      .attr('class', 'segment-measure-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'text-before-edge')
      .attr('transform', (d) => {
        let p1 = this._projectionUtils.latLngToSvgPoint(d[0]);
        let p2 = this._projectionUtils.latLngToSvgPoint(d[1]);
        return Helper.transformText(p1, p2, marginTopText);
      })
      .text(d => this._helper.formatLength(this._helper.computeLengthBetween(d[0], d[1])));

    text.exit().remove();
  }

  _updateCirclePosition(i, evt) {
    const circle = this._svgObjs.select(`circle[id=circle-${this._curGeomIndex}]`);
    if (circle.size() === 0) {
      return;
    }

    let x = Number(circle.attr('cx'));
    let y = Number(circle.attr('cy'));
    const r = this.geometry().svgRadius;

    switch(i) {
      case 0: // move rect
        x = evt.x;
        y = evt.y;
        break;
    }

    circle.attr('cx', x)
      .attr('cy', y)
      .attr('r', r);

    const gcircle = this._svgObjs.select(`g[id=gcircle-${this._curGeomIndex}`);

    if (gcircle.size() === 0) {
      return;
    }

    const line = gcircle.select('line');
    line.attr('x1', x)
      .attr('y1', y)
      .attr('x2', x + r)
      .attr('y2', y);
  }

  _updateCircleNode(i, evt) {
    const point = this._projectionUtils.svgPointToLatLng([evt.x, evt.y]);

    switch(i) {
      case 0: // move circle
        const r = this.geometry().svgRadius;
        const endpoint = [evt.x + r, evt.y];
        // // set center
        this.geometry().setCenter(point);
        // // set end point
        this.geometry().setEndPoint(this._projectionUtils.svgPointToLatLng(endpoint));
        break;
      case 1:
      case 2:
      case 3:
      case 4:
        const center = this._projectionUtils.latLngToSvgPoint(this.geometry().center);
        const a = Math.abs(center[0] - evt.x);
        const b = Math.abs(center[1] - evt.y);
        const radius = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));

        this.geometry().setEndPoint(this._projectionUtils.svgPointToLatLng([center[0], center[1] + radius]));
        break;
    }
  }
  // draw circle end ====================

  // draw rectangle start ====================
  drawRectangle() {
    if (this._drawing === 'rect') {
      return;
    }

    // remove geometries not valid
    this.geometries().forEach((geom, index) => {
      if (!geom.isValid) {
        this.removeGeometry(index);
      }
    });

    this.addGeometry(new GeometryRect());
    this._draw();
    this._drawing = 'rect';
  }

  _updateRectPosition(i, evt) {
    const rect = this._svgObjs.select(`rect[id=rect-${this._curGeomIndex}]`);
    if (rect.size() === 0) {
      return;
    }

    let x = Number(rect.attr('x'));
    let y = Number(rect.attr('y'));
    let w = Number(rect.attr('width'));
    let h = Number(rect.attr('height'));
    const point2 = [x + w, y + h];

    switch(i) {
      case 0: // move rect
        const mid = [x + w / 2, y + h / 2];
        x += evt.x - mid[0];
        y += evt.y - mid[1];
        break;
      case 1:
        x = evt.x;
        y = evt.y;
        w = Math.abs(x - point2[0]);
        h = Math.abs(y - point2[1]);
        break;
      case 2:
        y = evt.y;
        w = Math.abs(evt.x - x);
        h = Math.abs(point2[1] - y);
        break;
      case 3:
        w = Math.abs(evt.x - x);
        h = Math.abs(evt.y - y);
        break;
      case 4:
        x = evt.x;
        w = Math.abs(x - point2[0]);
        h = Math.abs(y - evt.y);
        break;
    }

    rect.attr('x', x)
      .attr('y', y)
      .attr('width', w)
      .attr('height', h);
  }

  _updateRectNode(i, evt) {
    const rect = this._svgObjs.select(`rect[id=rect-${this._curGeomIndex}]`);
    if (rect.size() === 0) {
      return;
    }

    const point = this._projectionUtils.svgPointToLatLng([evt.x, evt.y]);
    const coordinates = this.geometry().coordinates;

    switch(i) {
      case 0: // move rect
        let x = Number(rect.attr('x'));
        let y = Number(rect.attr('y'));
        const w = Number(rect.attr('width'));
        const h = Number(rect.attr('height'));
        const mid = [x + w / 2, y + h / 2];
        x += evt.x - mid[0];
        y += evt.y - mid[1];
        const x2 = x + w;
        const y2 = y + h;
        this.geometry().setFirstPoint(this._projectionUtils.svgPointToLatLng([x, y]));
        this.geometry().setEndPoint(this._projectionUtils.svgPointToLatLng([x2, y2]));
        break;
      case 1:
        this.geometry().setFirstPoint(point);
        this.geometry().setEndPoint(coordinates[2]);
        break;
      case 2:
        this.geometry().setFirstPoint([coordinates[0][0], point[1]]);
        this.geometry().setEndPoint([point[0], coordinates[2][1]]);
        break;
      case 3:
        this.geometry().setEndPoint(point);
        break;
      case 4:
        this.geometry().setFirstPoint([point[0], coordinates[0][1]]);
        this.geometry().setEndPoint([coordinates[2][0], point[1]]);
        break;
    }
  }

  _updateRectangle() {
    const rects = this._svgObjs.selectAll('rect')
      .data(this.rects)
      .attr('class', 'base-line')
      .attr('x', d => this._projectionUtils.latLngToSvgPoint(d.geom.coordinates[0])[0])
      .attr('y', d => this._projectionUtils.latLngToSvgPoint(d.geom.coordinates[0])[1])
      .attr('width', d => {
        const coord1 = d.geom.coordinates[0];
        const coord2 = d.geom.coordinates[2];
        let w = 0;

        if (coord1 && coord1.length && coord2 && coord2.length) {
          const point1 = this._projectionUtils.latLngToSvgPoint(coord1);
          const point2 = this._projectionUtils.latLngToSvgPoint(coord2);
          w = Number(point2[0]) - Number(point1[0]);
        }

        return w;
      })
      .attr('height', d => {
        const coord1 = d.geom.coordinates[0];
        const coord2 = d.geom.coordinates[2];
        let h = 0;

        if (coord1 && coord1.length && coord2 && coord2.length) {
          const point1 = this._projectionUtils.latLngToSvgPoint(coord1);
          const point2 = this._projectionUtils.latLngToSvgPoint(coord2);
          h = Number(point2[1]) - Number(point1[1])
        }

        return h;
      });

    if (this.geometry() instanceof GeometryRect) {
      const coord1 = this.geometry().coordinates[0];
      const coord2 = this.geometry().coordinates[2];

      if (coord1 && coord1.length && coord2 && coord2.length) {
        const point1 = this._projectionUtils.latLngToSvgPoint(coord1);
        const point2 = this._projectionUtils.latLngToSvgPoint(coord2);
        const w = Number(point2[0]) - Number(point1[0]);
        const h = Number(point2[1]) - Number(point1[1]);

        rects.enter()
          .append('rect')
          .attr('id', `rect-${this._curGeomIndex}`)
          .attr('class', 'base-line')
          .attr('x', point1[0])
          .attr('y', point1[1])
          .attr('width', w)
          .attr('height', h);
      }
    }

    this._updateSegmentTextRect();
  }

  _updateSegmentTextRect() {
    const groups = this._segmentText
      .selectAll('g[id^=g-rect-]')
      .data(this.rects);

    groups
      .enter()
      .append('g')
      .attr('id', d => `g-rect-${d.id}`);

    const text = groups
      .selectAll('text')
      .data(d => this.geometry(d.id).lines)
      .attr('class', 'segment-measure-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'text-before-edge')
      .attr('transform', (d) => {
        let p1 = this._projectionUtils.latLngToSvgPoint(d[0]);
        let p2 = this._projectionUtils.latLngToSvgPoint(d[1]);
        return Helper.transformText(p1, p2, marginTopText);
      })
      .text(d => this._helper.formatLength(this._helper.computeLengthBetween(d[0], d[1])));

    text
      .enter()
      .append('text')
      .attr('class', 'segment-measure-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'text-before-edge')
      .attr('transform', (d) => {
        let p1 = this._projectionUtils.latLngToSvgPoint(d[0]);
        let p2 = this._projectionUtils.latLngToSvgPoint(d[1]);
        return Helper.transformText(p1, p2, marginTopText);
      })
      .text(d => this._helper.formatLength(this._helper.computeLengthBetween(d[0], d[1])));

    text.exit().remove();
  }
  // draw rectangle end ====================

  drawEnd(ignore) {
    if (!this._drawing && !ignore) {
      return;
    }

    this._drawing = null;
    this._overlay.draw();
    this._dragged = false;

    this._svgOverlayEvent = this._svgOverlay.on('click', (evt) => {
      if (evt.target.id.match(/(rect|polygon|circle)\-(\d+)/g)) {
        const id = evt.target.id.match(/(rect|polygon|circle)\-(\d+)/)[2];
        this._curGeomIndex = Number(id);
      } else {
        this._curGeomIndex = 0;
      }

      this._overlay.draw();
      this._dragged = false;
    });

    if (!ignore) {
      if (typeof this._events.get(EVENT_OVERLAPPED) === 'function') {
        this._events.get(EVENT_OVERLAPPED)(this.checkIntersection());
      }
    }
  }
}