export default class Helper {
  constructor() {
    this._lengthMultiplier = 1;
    this.formatLength = this._formatLengthMetric;
    this._areaMultiplier = 1;
    this.formatArea = this._formatAreaMetric;
  }

  static findTouchPoint(segment, point) {
    const k =
      ((segment[1][1] - segment[0][1]) * (point[0] - segment[0][0]) -
        (segment[1][0] - segment[0][0]) * (point[1] - segment[0][1])) /
      (Math.pow(segment[1][1] - segment[0][1], 2) +
        Math.pow(segment[1][0] - segment[0][0], 2));
    return [
      point[0] - k * (segment[1][1] - segment[0][1]),
      point[1] + k * (segment[1][0] - segment[0][0]),
    ];
  }

  static findMidPoint(segment) {
    return [
      (segment[0][0] + segment[1][0]) / 2,
      (segment[0][1] + segment[1][1]) / 2,
    ];
  }

  static transformText(p1, p2, marginTop = 0) {
    let mid = Helper.findMidPoint([p1, p2]);
    let angle;
    if (p1[0] === p2[0]) {
      if (p2[1] > p1[1]) angle = 90;
      else if (p2[1] < p1[1]) angle = 270;
      else angle = 0;
    } else {
      angle = (Math.atan((p2[1] - p1[1]) / (p2[0] - p1[0])) * 180) / Math.PI;
    }

    if (angle === 0) {
      mid[1] += marginTop;
    }
    if (angle === 90) {
      mid[1] -= marginTop;
    }
    if (angle === 270) {
      mid[0] += marginTop;
    }

    return `translate(${mid[0]}, ${mid[1]}) rotate(${angle})`;
  }

  computeOffset(point, distance, degree) {
    return google.maps.geometry.spherical.computeOffset(new google.maps.LatLng(point[1], point[0]), distance, degree);
  }

  /**
   * Calculate the distance in meters between two points.
   * @param p1
   * @param p2
   * @return {*}
   */
  computeLengthBetween(p1, p2) {
    return (
      google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(p1[1], p1[0]),
        new google.maps.LatLng(p2[1], p2[0])
      ) * this._lengthMultiplier
    );
  }

  computePathLength(points) {
    let sum = 0;
    for (let i = 1; i < points.length; i++) {
      sum += google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(points[i - 1][1], points[i - 1][0]),
        new google.maps.LatLng(points[i][1], points[i][0])
      );
    }
    return sum * this._lengthMultiplier;
  }

  computeArea(points) {
    return (
      google.maps.geometry.spherical.computeArea(
        points.map((p) => new google.maps.LatLng(p[1], p[0]))
      ) * this._areaMultiplier
    );
  }

  _formatLengthMetric(value) {
    let unit;
    if (value / 1000 >= 1) {
      unit = 'km';
      value /= 1000;
    } else {
      unit = 'm';
    }
    return this._numberToLocale(this._roundUp(value, 2)) + ' ' + unit;
  }

  _formatAreaMetric(value) {
    let unit;
    if (value / 1000000 >= 1) {
      unit = 'km²';
      value /= 1000000;
    } else {
      unit = 'm²';
    }
    return this._numberToLocale(this._roundUp(value, 2)) + ' ' + unit;
  }

  _roundUp(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals).toFixed(decimals);
  }

  _numberToLocale(number) {
    return new Intl.NumberFormat().format(number);
  }
}
