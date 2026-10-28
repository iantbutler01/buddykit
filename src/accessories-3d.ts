import type { BufferGeometry, Mesh } from 'three';
import type { BuddyConfig } from './config';
import { AccessorySolids } from './accessory-solids';
import { buildHeadwear } from './accessory-headwear';
import { buildHeadset } from './accessory-headset';
import { faceLayout } from './face-layout';

/** Solid accessories share the same body coordinates, so pitch and yaw reveal their volume. */
export function accessoryMeshes(config: BuddyConfig, body: BufferGeometry): Mesh[] {
  body.computeBoundingBox();
  const bounds = body.boundingBox!;
  const top = bounds.max.y, bottom = bounds.min.y, front = bounds.max.z+.025;
  const face = faceLayout(config);
  const white='#fff4dc', ink='#242326';
  return config.accessories.flatMap(name => {
    const defaultColor = name==='hardhat'?'#ffd13a':name==='santa'?'#e33142':ink;
    const color=config.accessoryColors[name] ?? config.accessoryTone ?? defaultColor;
    const s=new AccessorySolids(name,color);
    if(buildHeadwear(s,name,top)) return s.meshes;
    const ey=face.centerY, ex=face.halfSpacing;
    const neck=bottom*.44, chest=bottom*.5;
    switch(name) {
      case 'none': break;
      case 'glasses': case 'monocle': case 'sunglasses': {
        const lens = face.lensRadius;
        const lensWidth = lens;
        for(const sign of name==='monocle'?[1]:[-1,1]) {
          const x=sign*ex+face.centerX;
          if(name==='sunglasses') s.ball(x,ey,front+.035,lensWidth*1.06,lens*.92,.045);
          else s.ring(x,ey,front+.035,lens,.022);
          s.tube([[x+sign*lensWidth,ey,front+.035],[sign*.72,ey+.015,front],[sign*.87,ey+.015,-.02]],.018);
        }
        if(name!=='monocle') s.tube([[-ex+lensWidth,ey+.035,front+.035],[0,ey+.065,front+.045],[ex-lensWidth,ey+.035,front+.035]],.018);
        else s.tube([[ex+lens*.75,ey-lens*.7,front+.035],[.55,-.17,front+.04],[.43,chest,front+.025]],.012);
        break;
      }
      case 'headset':
        buildHeadset(s,body,ey,front); break;
      case 'tie':
        s.plate([[-.07,chest+.12],[.07,chest+.12],[.05,chest],[0,chest-.04],[-.05,chest]],front,.045);
        s.plate([[0,chest+.015],[.11,chest-.30],[0,chest-.39],[-.11,chest-.30]],front,.045); break;
      case 'bowtie':
        for(const sign of [-1,1]) s.plate([[0,neck],[sign*.22,neck+.10],[sign*.22,neck-.10]],front,.06);
        s.ball(0,neck,front+.055,.06,.065,.045); break;
      case 'scarf':
        s.garment(body,neck-.14,neck+.03);
        s.plate([[.07,neck-.07],[.19,neck-.07],[.20,neck-.35],[.08,neck-.29]],front,.05); break;
      case 'shirt': case 'hoodie':
        s.garment(body,bottom-.03,neck+.10);
        if(name==='hoodie') {
          s.tube([[-.25,neck+.12,front],[0,neck-.02,front+.10],[.25,neck+.12,front]],.075);
          for(const sign of [-1,1]) s.tube([[sign*.14,neck,front+.13],[sign*.14,neck-.24,front+.13]],.014,white);
        } break;
      case 'cape':
        s.plate([[-.64,neck+.18],[.64,neck+.18],[.96,bottom-.08],[0,bottom-.02],[-.96,bottom-.08]],-.36,.07); break;
      case 'stethoscope':
        for(const sign of [-1,1]) s.tube([[sign*.28,neck+.24,front],[sign*.30,neck-.10,front+.04],[sign*.12,chest-.24,front+.045],[.05,chest-.22,front+.05]],.022);
        s.ball(.05,chest-.22,front+.08,.09,.09,.035,white);break;
      case 'badge':
        s.box(.44,chest,front+.03,.19,.25,.04,white);
        s.box(.44,chest+.14,front+.05,.04,.065,.035);
        s.box(.41,chest+.04,front+.06,.065,.065,.012);
        s.box(.44,chest-.06,front+.06,.12,.016,.012);break;
      case 'toolbelt':
        s.garment(body,bottom*.82,bottom*.66);
        s.box(0,bottom*.74,front+.025,.14,.11,.06,white);
        s.box(0,bottom*.74,front+.065,.095,.06,.02);
        for(const sign of [-1,1]) s.box(sign*.43,bottom*.82,front,.18,.22,.12);break;
      case 'mane':
        s.garment(body,ey+.15,top+.02);
        s.plate([[-.14,ey+.20],[.14,ey+.20],[0,ey+.045]],front,.035);break;
    }
    return s.meshes;
  });
}
