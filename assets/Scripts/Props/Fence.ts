import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { HPBar } from "db://assets/Scripts/HPBar";
const { ccclass, property } = _decorator;

@ccclass('Fence')
export class Fence extends Component {
    @property(HPBar)
    hpBar: HPBar = null!;

    @property([Sprite])
    fenceSprites: Sprite[] = [];

    @property(SpriteFrame)
    normalSprite: SpriteFrame = null!;

    @property(SpriteFrame)
    whiteSprite: SpriteFrame = null!;

    @property
    maxHP: number = 4000;

    private currentHP: number = 4000;
    private isDestroyed: boolean = false;
    public static readonly EVENT_DESTROYED = 'fence-destroyed'; // Thêm sự kiện

    start() {
        this.currentHP = this.maxHP;
        if (this.hpBar) {
            this.hpBar.setMaxHP(this.maxHP);
            this.hpBar.node.active = false;
        }
    }

    public takeDamage(damage: number) {
        if (this.isDestroyed) return;

        this.currentHP -= damage;

        if (this.hpBar && this.currentHP < this.maxHP) {
            this.hpBar.node.active = true;
            this.hpBar.setHP(this.currentHP);
        }

        this.flashWhite();

        if (this.currentHP <= 0) {
            this.destroyFence();
        }
    }

    private flashWhite() {
        if (this.fenceSprites.length === 0 || !this.whiteSprite || !this.normalSprite) return;

        for (let sprite of this.fenceSprites) {
            sprite.spriteFrame = this.whiteSprite;
        }

        this.scheduleOnce(() => {
            for (let sprite of this.fenceSprites) {
                sprite.spriteFrame = this.normalSprite;
            }
        }, 0.1);
    }

    private destroyFence() {
        this.isDestroyed = true;
        this.node.emit(Fence.EVENT_DESTROYED, this.node.worldPosition); // Phát sự kiện khi bị phá hủy
        this.node.destroy();
    }
}