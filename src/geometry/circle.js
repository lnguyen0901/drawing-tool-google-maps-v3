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

  get isValid() {
    return this.center && this.center.length > 0 && this.endpoint && this.endpoint.length > 0;
  }

  constructor(projection, data) {
    super();
    this._projection = projection;
    this._center = [];
    this._endpoint = [];
    this._coordinates = [];

    if (data) {
      this._center = data.center;
      this._coordinates[0] = this.center;
      const endpoint = this._helper.computeOffset(this.center, data.radius, 0);
      this.setEndPoint([endpoint.lng(), endpoint.lat()]);
    }
  }

  setCenter(point) {
    this._center = point;
    this._coordinates[0] = point;
  }

  setEndPoint(point) {
    this._endpoint = point;
    // set coordinates
    const radius = this._helper.computeLengthBetween(this.center, this.endpoint);
    const north = this._helper.computeOffset(this.center, radius, 0);
    const west = this._helper.computeOffset(this.center, radius, -90);
    const south = this._helper.computeOffset(this.center, radius, 180);
    const east = this._helper.computeOffset(this.center, radius, 90);

    this._coordinates[1] = [north.lng(), north.lat()];
    this._coordinates[2] = [east.lng(), east.lat()];
    this._coordinates[3] = [south.lng(), south.lat()];
    this._coordinates[4] = [west.lng(), west.lat()];
  }

  data() {
    return {
      type: 'circle',
      center: this.center,
      radius: this._helper.computeLengthBetween(this.center, this.endpoint)
    }
  }
}
