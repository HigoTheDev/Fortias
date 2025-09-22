import { _decorator, Component, Sprite, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('HPBar')
export class HPBar extends Component {
    @property(Sprite)
    hpBg: Sprite = null!;

    @property(Sprite)
    hpFill: Sprite = null!;

    private maxHP: number = 4000;
    private currentHP: number = 4000;

    start() {
        this.updateBar();
    }

    public setHP(hp: number) {
        this.currentHP = Math.max(0, Math.min(this.maxHP, hp));
        this.updateBar();
    }

    public setMaxHP(max: number) {
        this.maxHP = max;
        this.currentHP = max;
        this.updateBar();
    }

    private updateBar() {
        const ratio = this.currentHP / this.maxHP;
        this.hpFill.fillRange = ratio;
    }
}
