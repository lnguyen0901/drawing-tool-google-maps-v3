import GeometryBase from './base';

export default class GeometryPolyline extends GeometryBase {
  get nodes() {
    return Object.assign([], this.coordinates);
  }

  get coordinates() {
    return Object.assign([], this._coordinates);
  }

  get lines() {
    let segments = [];
    if (this.coordinates.length > 1) {
      for (let i = 1; i < this.coordinates.length; i++) {
        segments.push([this.coordinates[i - 1], this.coordinates[i]]);
      }
    }

    return segments;
  }

  get area() {
    return 0;
  }

  constructor() {
    super();
    this._coordinates = [];
  }

  addPoint(point) {
    this._coordinates.push(point);
  }

  updatePoint(i, point) {
    this._coordinates[i] = point;
  }
}
