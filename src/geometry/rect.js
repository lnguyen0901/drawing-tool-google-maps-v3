import GeometryBase from './base';
import Helper from '../helper';

export default class GeometryRect extends GeometryBase {
  get width() {
    return this._helper.computeLengthBetween(this._coordinates[0], this._coordinates[1]);
  }

  get height() {
    return this._helper.computeLengthBetween(this._coordinates[1], this._coordinates[2]);
  }

  get nodes() {
    if (this.coordinates.length > 1) {
      const mid = Helper.findMidPoint([this.coordinates[0], this.coordinates[2]]);
      return Object.assign([], [mid].concat(this.coordinates));
    }

    return Object.assign([], this.coordinates);
  }

  get textNodes() {
    if (this.coordinates.length > 1) {
      return [
        this.coordinates[0],
        this.coordinates[2]
      ];
    }

    return [this.coordinates[0]];
  }

  get coordinates() {
    return Object.assign([], this._coordinates);
  }

  get lines() {
    if (this.coordinates.length > 1) {
      return Object.assign([], [
        [this.coordinates[3], this.coordinates[2]],
        [this.coordinates[2], this.coordinates[1]]
      ]);
    }

    return Object.assign([], []);
  }

  get area() {
    if (this.coordinates.length <= 1) {
      return 0;
    }

    return this.width * this.height;
  }

  get isValid() {
    return this._first && this._coordinates.length >= 4;
  }

  constructor(data) {
    super();
    this._coordinates = [];
    this._first = [];

    if (data) {
      this._first = data.coordinates[0];
      this._coordinates = data.coordinates;
    }
  }

  setFirstPoint(point) {
    this._first = point;
    this._coordinates[0] = point;
  }

  setEndPoint(point) {
    // drag from left -> right
    const x1 = this._first[0];
    const y1 = this._first[1];
    const x2 = point[0];
    const y2 = point[1];

    if (x2 > x1) {
      // top -> bottom
      if (y2 < y1) {
        this._coordinates = [
          [x1, y1],
          [x2, y1],
          [x2, y2],
          [x1, y2]
        ];
      } else { // bottom -> top
        this._coordinates = [
          [x1, y2],
          [x2, y2],
          [x2, y1],
          [x1, y1]
        ];
      }
    }

    // drag from right -> left
    if (x2 < x1) {
      // top -> bottom
      if (y2 < y1) {
        this._coordinates = [
          [x2, y1],
          [x1, y1],
          [x1, y2],
          [x2, y2]
        ];
      } else { // bottom -> top
        this._coordinates = [
          [x2, y2],
          [x1, y2],
          [x1, y1],
          [x2, y1]
        ];
      }
    }
  }

  data() {
    return {
      type: 'rect',
      coordinates: this.coordinates,
      width: this.width,
      height: this.height
    }
  }
}
