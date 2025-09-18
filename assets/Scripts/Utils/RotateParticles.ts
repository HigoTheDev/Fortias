import {_decorator, Component, Node, ParticleSystem, CurveRange} from 'cc';

const {ccclass, property} = _decorator;

@ccclass('RotateParticles')
export class RotateParticles extends Component {

  @property(ParticleSystem)
  listParticles: ParticleSystem[] = [];

  rotate(angle: number) {
    this.listParticles.forEach((particleSystem)  => {
      let newAngle = 90 + angle;
      //convert to radian
      newAngle = newAngle * Math.PI / 180;
      particleSystem.startRotationZ.constant = newAngle;
    })
  }
}


