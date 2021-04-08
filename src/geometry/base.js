import { DrawingConst } from '../constants';
import Helper from '../helper';

export default class GeometryBase {
  constructor() {
    this._helper = new Helper({
      unit: DrawingConst.unit,
    });
  }
}
