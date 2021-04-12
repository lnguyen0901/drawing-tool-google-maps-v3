import GeometryBase from './base';

export default class GeometryPolygon extends GeometryBase {
  get nodes() {
    const nodes = Object.assign([], this.coordinates);

    if (this.isClosed) {
      nodes.push(this.center);
    }

    return nodes;
  }

  get coordinates() {
    return Object.assign([], this._coordinates);
  }

  get lines() {
    const segments = [];
    const coords = this.coordinates;

    if (this.isClosed) {
      coords.push(coords[0]);
    }

    if (coords.length > 1) {
      for (let i = 1; i < coords.length; i++) {
        segments.push([coords[i - 1], coords[i]]);
      }
    }

    return segments;
  }

  get isClosed() {
    return this._closed === true;
  }

  get area() {
    return this._helper.computeArea(this.nodes);
  }

  get center() {
    let xMin = this.coordinates[0][0];
    let xMax = this.coordinates[0][0];
    let yMin = this.coordinates[0][1];
    let yMax = this.coordinates[0][1];

    this.coordinates.forEach(node => {
      if (xMin > node[0]) {
        xMin = node[0];
      }

      if (xMax < node[0]) {
        xMax = node[0];
      }

      if (yMin > node[1]) {
        yMin = node[1];
      }

      if (yMax < node[1]) {
        yMax = node[1];
      }
    });

    return [xMin + (xMax - xMin) / 2, yMin + (yMax - yMin) / 2];
  }

  get isValid() {
    return this._closed === true;
  }

  constructor(data) {
    super();
    this._closed = false;
    this._coordinates = [];

    if (data) {
      this._closed = true;
      this._coordinates = data.coordinates;
    }
  }

  addPoint(point) {
    this._coordinates.push(point);
  }

  updatePoint(i, point) {
    this._coordinates[i] = point;
  }

  updatePoints(points) {
    this._coordinates = points;
  }

  setClosed() {
    this._closed = true;
  }

  data() {
    return {
      type: 'polygon',
      coordinates: this.coordinates
    };
  }
}
