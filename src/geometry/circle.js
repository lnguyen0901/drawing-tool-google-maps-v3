import GeometryBase from './base';

export default class GeometryCircle extends GeometryBase {
  get nodes() {
    return this.coordinates;
  }

  get coordinates() {
    return Object.assign([], this._coordinates);
  }

  get lines() {
    if (this.coordinates.length > 1) {
      return Object.assign([], [
        [this.coordinates[0], this.coordinates[2]]
      ]);
    }

    return Object.assign([], []);
  }

  get center() {
    return this._center;
  }

  get endpoint() {
    return this._endpoint;
  }

  get area() {
    if (!this.center || !this.endpoint) {
      return 0;
    }

    const radius = this._helper.computeLengthBetween(this.center, this.endpoint);

    return Math.PI * Math.pow(radius, 2);
  }

  get svgRadius() {
    if (!this.center || !this.endpoint)  {
      return 0;
    }

    const center = this._projection.latLngToSvgPoint(this.center);
    const endpoint = this._projection.latLngToSvgPoint(this.endpoint);
    const a = Math.abs(center[0] - endpoint[0]);
    const b = Math.abs(center[1] - endpoint[1]);

    return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
  }

  constructor(projection) {
    super();
    this._projection = projection;
    this._center = [];
    this._endpoint = [];
    this._coordinates = [];
  }

  setCenter(point) {
    this._center = point;
    this._coordinates[0] = point;
  }

  setEndPoint(point) {
    this._endpoint = point;
    // set coordinates
    const center = this._projection.latLngToSvgPoint(this.center);
    const distance = this.svgRadius;

    this._coordinates[1] = this._projection.svgPointToLatLng([center[0], center[1] + distance]);
    this._coordinates[2] = this._projection.svgPointToLatLng([center[0] + distance, center[1]]);
    this._coordinates[3] = this._projection.svgPointToLatLng([center[0], center[1] - distance]);
    this._coordinates[4] = this._projection.svgPointToLatLng([center[0] - distance, center[1]]);
  }
}
